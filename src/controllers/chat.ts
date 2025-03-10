import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { getRecieverSocketId, io } from "../socket/socket.js";
import generateSmartReplies from "../agents/smartReplies.js";
import { HumanMessage } from "@langchain/core/messages";
import toolAgent from "../agents/toolAgent.js";
import searchAgent from "../agents/searchAgent.js";
import llmAgent from "../agents/chatAgent.js";
import { StreamHandler } from "../utils/streamHandler.js";

const prisma = new PrismaClient();
const BOT_ID = "869edb54-d299-4821-bfd6-8a612f26acc3";

export const chat = async (req: Request, res: Response) => {
  try {
    const { content, receiverId } = req.body;
    const user = req.user as JwtPayload | undefined;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message content cannot be empty",
      });
    }

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        error: "Receiver ID is required",
      });
    }

    if (!user?.id) {
      return res.status(401).json({
        success: false,
        error: "User authentication required",
      });
    }

    if (user.id === receiverId) {
      return res.status(400).json({
        success: false,
        error: "Cannot send message to yourself",
      });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: "Receiver not found",
      });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { has: user.id } },
          { participants: { has: receiverId } },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: [user.id, receiverId],
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: user.id,
        receiverId,
        conversationId: conversation.id,
      },
      include: {
        sender: {
          select: {
            name: true,
            profilePic: true,
          },
        },
      },
    });

    const receiverSocketId = getRecieverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message", {
        ...message,
        createdAt: message.createdAt.toISOString(),
      });
    }

    return res.status(200).json(message);
  } catch (error) {
    console.error("Error in chat endpoint:", error);

    if (
      error instanceof Error &&
      error.name === "PrismaClientKnownRequestError"
    ) {
      return res.status(500).json({
        success: false,
        error: "Database error occurred",
      });
    }

    if (error instanceof Error && error.name === "SocketError") {
      return res.status(200).json({
        success: true,
        data: error.message,
        warning: "Message saved but real-time delivery failed",
      });
    }

    return res.status(500).json({
      success: false,
      error: "An internal server error occurred",
    });
  }
};

export const getSmartReplies = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;
    const user = req.user as JwtPayload | undefined;

    if (!user?.id) {
      return res.status(401).json({
        success: false,
        error: "User authentication required",
      });
    }

    const recentMessages = await prisma.conversation.findFirst({
      select: {
        messages: {
          select: {
            content: true,
            senderId: true,
          },
          where: {
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000),
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      where: { id: conversationId },
    });

    if (recentMessages) {
      const conversation = recentMessages.messages.reverse();

      const userMap: { [key: string]: string } = {};

      const updatedConversation = conversation.map((msg) => {
        if (!userMap[msg.senderId]) {
          userMap[msg.senderId] = `user${Object.entries(userMap).length + 1}`;
        }

        return {
          message: msg.content,
          sender: userMap[msg.senderId],
        };
      });

      const replies = await generateSmartReplies(updatedConversation, user.id);
      return res.status(200).json(replies);
    }
    return res.status(404).json([]);
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred",
    });
  }
};

export const chatWithBot = async (req: Request, res: Response) => {
  try {
    const { query, method } = req.body;
    const user = req.user as { id: string } | undefined;

    if (!user?.id) {
      return res.status(401).json({
        error: "Authentication Failed",
        details: "User authentication token is missing or invalid",
      });
    }

    if (!query?.trim() && !method) {
      return res.status(400).json({
        error: "Invalid Request",
        details: "Query or Method is not defined",
      });
    }

    const validMethods = ["search", "execute", "llm"];
    if (method && !validMethods.includes(method)) {
      return res.status(400).json({
        error: "Invalid Method",
        details: `Allowed methods are: ${validMethods.join(", ")}`,
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let conversation;
    try {
      conversation = await prisma.conversation.findFirst({
        where: { participants: { hasEvery: [BOT_ID, user.id] } },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { participants: [BOT_ID, user.id] },
        });
      }

      await prisma.message.create({
        data: {
          content: query,
          senderId: user.id,
          receiverId: BOT_ID,
          conversationId: conversation.id,
        },
      });
    } catch (dbError) {
      console.error("Database Operation Error:", dbError);
      return res.status(500).json({
        error: "Database Error",
        details: "Failed to create or find conversation",
      });
    }

    const threadConfig = { thread_id: user.id };
    let finalResult = "";

    try {
      switch (method) {
        case "search":
          console.log("searching....");

          const searchResult = await searchAgent.invoke(
            { messages: [new HumanMessage(query)] },
            {
              configurable: threadConfig,
              callbacks: [new StreamHandler(res, "data")],
            }
          );

          finalResult = searchResult.messages.slice(-1)[0].content.toString();

          res.write("data: [DONE]\n\n");
          break;

        case "execute":
          console.log("executing....");

          const toolStream = await toolAgent.stream(
            {
              task: query,
              userId: user.id,

              responseObject: res,
            },
            {
              configurable: threadConfig,
            }
          );

          for await (const item of toolStream) {
            console.dir(item, { depth: null });
            res.write(`log: ${JSON.stringify(item)}\u001D`);
            finalResult = item.solve?.result;
          }

          res.write("data: [DONE]\u001D");
          break;

        default:
        case "llm":
          console.log("llm...");

          const llmResult = await llmAgent.invoke(
            { messages: [new HumanMessage(query)] },
            {
              configurable: threadConfig,
              callbacks: [new StreamHandler(res, "data")],
            }
          );

          finalResult = llmResult.messages.slice(-1)[0].content.toString();

          res.write("data: [DONE]\n\n");
          break;
      }
    } catch (agentError) {
      console.error(`Agent Error for method ${method}:`, agentError);
      res.write(
        `error: ${JSON.stringify({
          error: "Agent Processing Failed",
          details: `Error occurred during ${method} method processing`,
          message: (agentError as Error).message,
        })}\n\n`
      );
      res.write("data: [ERROR]\n\n");
    }

    if (finalResult.trim() !== "") {
      try {
        await prisma.message.create({
          data: {
            content: finalResult,
            senderId: BOT_ID,
            receiverId: user.id,
            conversationId: conversation.id,
          },
        });
      } catch (saveError) {
        console.error("Failed to save bot's response:", saveError);
      }
    }

    res.end();
  } catch (globalError) {
    console.error("Unhandled Chat Controller Error:", globalError);

    res.status(500).json({
      error: "Internal Server Error",
      details: "An unexpected error occurred during chat processing",
    });
  }
};
