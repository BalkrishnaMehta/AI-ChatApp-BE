import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";

const prisma = new PrismaClient();
const BOT_ID = "869edb54-d299-4821-bfd6-8a612f26acc3";

export const getConversations = async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload | undefined;

    if (!user || !user.id) {
      return res.status(401).json({
        error: "User authentication required",
      });
    }

    let conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          has: user.id,
        },
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    const conversationsWithoutBot = conversations.filter(
      (conversation) => !conversation.participants.includes(BOT_ID)
    );

    const conversationsWithOtherUser = await Promise.all(
      conversationsWithoutBot.map(async (conversation) => {
        const otherUser = await prisma.user.findFirst({
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true,
            lastActive: true,
          },
          where: {
            id: conversation.participants.filter((item) => item !== user.id)[0],
          },
        });

        return {
          ...conversation,
          otherUser: otherUser,
        };
      })
    );

    return res.status(200).json(conversationsWithOtherUser);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ error: "Failed to fetch conversations" });
  } finally {
    await prisma.$disconnect();
  }
};

export const getMessagesByConversationId = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const user = req.user as JwtPayload | undefined;

    if (!user || !user.id) {
      return res.status(401).json({
        error: "User authentication required",
      });
    }

    if (!id) {
      return res.status(400).json({
        error: "Conversation ID is required",
      });
    }

    let messages = await prisma.message.findMany({
      where: {
        conversationId: id,
      },
    });

    return res.status(200).json(messages || []);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  } finally {
    await prisma.$disconnect();
  }
};

export const getMessagesWithBot = async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload | undefined;

    if (!user || !user.id) {
      return res.status(401).json({
        error: "User authentication required",
      });
    }

    const data = await prisma.conversation.findFirst({
      where: {
        participants: {
          hasEvery: [BOT_ID, user.id],
        },
      },
      select: { messages: true },
    });

    return res.status(200).json(data?.messages || []);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  } finally {
    await prisma.$disconnect();
  }
};
