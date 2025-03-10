import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

const prisma = new PrismaClient();
const BOT_ID = "869edb54-d299-4821-bfd6-8a612f26acc3";

const createConversation = tool(
  async ({ participants }: { participants: string[] }) => {
    try {
      const conversation = await prisma.conversation.create({
        data: { participants },
      });
      return conversation.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
  },
  {
    name: "CreateNewConversation",
    description:
      "Creates a new conversation thread. Use when the user wants to start a conversation with specific participants where no conversation exists between them. Returns the new conversation data.",
    schema: z.object({
      participants: z.array(z.string().uuid()),
    }),
  }
);

const fetchConversationIdByParticipants = tool(
  async ({ participants }: { participants: string[] }) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { participants: { hasEvery: participants } },
        select: { id: true },
      });
      return conversation?.id ?? null;
    } catch (error) {
      console.error("Error fetching conversation ID:", error);
      return null;
    }
  },
  {
    name: "FindConversationIdByParticipants",
    description:
      "Finds the ID of an existing conversation between a specific set of participants. Use this to check if a conversation already exists before creating a new one. Input should be a list of user IDs. Returns the conversation ID if found, otherwise indicates no conversation exists.",
    schema: z.object({
      participants: z.array(z.string().uuid()),
    }),
  }
);

const fetchMessagesByConversationId = tool(
  async ({
    conversationId,
    limit,
    start,
  }: {
    conversationId: string;
    limit?: number;
    start?: number;
  }) => {
    try {
      const messages = await prisma.conversation.findFirst({
        where: { id: conversationId },
        select: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: start,
          },
        },
      });
      return messages ?? [];
    } catch (error) {
      console.error("Error fetching messages by conversation ID:", error);
      return [];
    }
  },
  {
    name: "GetMessagesByConversation",
    description:
      "Retrieves messages from a specific conversation, ordered by most recent first. Requires the conversation ID. Use when the user asks for messages within a specific conversation. Use limit and start for pagination. Returns a list of messages.",
    schema: z.object({
      conversationId: z.string().uuid(),
      limit: z.number().optional(),
      start: z.number().optional(),
    }),
  }
);

const fetchUserConversations = tool(
  async ({ userId }: { userId: string }) => {
    try {
      const conversations = await prisma.conversation.findMany({
        where: { participants: { has: userId } },
      });
      return conversations ?? [];
    } catch (error) {
      console.error("Error fetching user conversations:", error);
      return [];
    }
  },
  {
    name: "ListUserConversations",
    description:
      "Gets a list of all conversation threads a user is participating in. Requires the user ID. Returns a list of conversation IDs and participants.",
    schema: z.object({
      userId: z.string().uuid(),
    }),
  }
);

const fetchMessagesBySenderId = tool(
  async ({
    senderId,
    limit,
    start,
  }: {
    senderId: string;
    limit?: number;
    start?: number;
  }) => {
    try {
      const messages = await prisma.message.findMany({
        where: {
          senderId,
          receiverId: { not: BOT_ID },
        },
        take: limit ?? 5,
        skip: start ?? 0,
        orderBy: { createdAt: "desc" },
      });
      return messages ?? [];
    } catch (error) {
      console.error("Error fetching messages by sender ID:", error);
      return [];
    }
  },
  {
    name: "GetLastSentMessages",
    description:
      "Retrieves the last messages sent by a specific user, ordered by most recent first. Requires the user ID. Use when the user asks for their own last messages. Returns a list of messages.",
    schema: z.object({
      senderId: z.string().uuid(),
      limit: z.number().optional(),
      start: z.number().optional(),
    }),
  }
);

const fetchMessagesBetweenUsers = tool(
  async ({
    senderId,
    receiverId,
    limit,
    start,
  }: {
    senderId: string;
    receiverId: string;
    limit?: number;
    start?: number;
  }) => {
    try {
      const messages = await prisma.conversation.findFirst({
        where: { participants: { hasEvery: [senderId, receiverId] } },
        select: { messages: true },
        take: limit,
        skip: start,
      });
      return messages ?? [];
    } catch (error) {
      console.error("Error fetching messages between users:", error);
      return [];
    }
  },
  {
    name: "GetConversationMessagesBetweenUsers",
    description:
      "Retrieves the messages exchanged between two specific users. Requires both user IDs. Use when the user asks for the message history between themselves and another user. Returns a list of messages.",
    schema: z.object({
      senderId: z.string().uuid(),
      receiverId: z.string().uuid(),
      limit: z.number().optional(),
      start: z.number().optional(),
    }),
  }
);

const createMessage = tool(
  async ({
    senderId,
    receiverId,
    content,
    conversationId,
  }: {
    senderId: string;
    receiverId: string;
    content: string;
    conversationId: string;
  }) => {
    try {
      const message = await prisma.message.create({
        data: { content, senderId, receiverId, conversationId },
      });
      return message;
    } catch (error) {
      console.error("Error creating message:", error);
      return null;
    }
  },
  {
    name: "SendMessage",
    description:
      "Sends a new message in a conversation. Requires the sender's ID, receiver's ID, the message content, and the conversation ID. Returns the ID of the sent message.",
    schema: z.object({
      senderId: z.string().uuid(),
      receiverId: z.string().uuid(),
      content: z.string(),
      conversationId: z.string().uuid(),
    }),
  }
);

const fetchUserByName = tool(
  async ({ name }: { name: string }) => {
    try {
      const users = await prisma.user.findMany({
        where: { name: { contains: name, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          name: true,
          profilePic: true,
          lastActive: true,
          createdAt: true,
        },
      });
      return users[0].id ?? null;
    } catch (error) {
      console.error("Error fetching users by name:", error);
      return null;
    }
  },
  {
    name: "SearchUserByName",
    description:
      "Searches for users by name. Provides a case-insensitive partial match. Use when the user is trying to find another user by name. Returns a list of users.",
    schema: z.object({
      name: z.string(),
    }),
  }
);

const fetchUserById = tool(
  async ({ userId }: { userId: string }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          profilePic: true,
          lastActive: true,
          createdAt: true,
        },
      });
      return user ?? null;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }
  },
  {
    name: "GetUserDetails",
    description: "Gets user details by their unique ID. Returns user details.",
    schema: z.object({
      userId: z.string().uuid(),
    }),
  }
);

const getUserMessageStats = tool(
  async ({ userId }: { userId: string }) => {
    try {
      const [sentCount, receivedCount] = await Promise.all([
        prisma.message.count({ where: { senderId: userId } }),
        prisma.message.count({ where: { receiverId: userId } }),
      ]);

      return {
        sentCount,
        receivedCount,
        totalCount: sentCount + receivedCount,
      };
    } catch (error) {
      console.error("Error getting user message stats:", error);
      return { sentCount: 0, receivedCount: 0, totalCount: 0 };
    }
  },
  {
    name: "GetUserMessageStatistics",
    description:
      "Calculates and returns the user's messaging statistics, including the number of messages sent and received. Requires the user's ID. Returns a string with the statistics.",
    schema: z.object({
      userId: z.string().uuid(),
    }),
  }
);

const getConversationStats = tool(
  async ({ conversationId }: { conversationId: string }) => {
    try {
      const [messageCount, participants] = await Promise.all([
        prisma.message.count({ where: { conversationId } }),
        prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { participants: true },
        }),
      ]);

      return {
        messageCount,
        participantCount: participants?.participants.length || 0,
      };
    } catch (error) {
      console.error("Error getting conversation stats:", error);
      return { messageCount: 0, participantCount: 0 };
    }
  },
  {
    name: "GetConversationStatistics",
    description:
      "Provides statistics for a specific conversation, such as the total number of messages and the number of participants. Requires the conversation ID. Returns a string with the statistics.",
    schema: z.object({
      conversationId: z.string().uuid(),
    }),
  }
);

const searchUserMessages = tool(
  async ({
    userId,
    query,
    limit,
  }: {
    userId: string;
    query: string;
    limit?: number;
  }) => {
    try {
      const messages = await prisma.message.findMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
          content: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
          receiverId: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return messages ?? [];
    } catch (error) {
      console.error("Error searching user messages:", error);
      return [];
    }
  },
  {
    name: "SearchUserMessages",
    description:
      "Searches through a user's messages (both sent and received) for a specific keyword or phrase. Requires the user's ID and the search query. Returns a list of messages matching the query.",
    schema: z.object({
      userId: z.string().uuid(),
      query: z.string(),
      limit: z.number().optional(),
    }),
  }
);

const tools = [
  createConversation,
  fetchConversationIdByParticipants,
  fetchMessagesByConversationId,
  fetchUserConversations,
  fetchMessagesBySenderId,
  fetchMessagesBetweenUsers,
  createMessage,
  fetchUserByName,
  fetchUserById,
  getUserMessageStats,
  getConversationStats,
  searchUserMessages,
];

export default tools;
