import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import Fuse from "fuse.js";
import { JwtPayload } from "jsonwebtoken";

const prisma = new PrismaClient();

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload | undefined;

    if (!user?.id) {
      return res.status(401).json({
        success: false,
        error: "User authentication required",
      });
    }

    const query = req.query.query as string;
    const limit = 5;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Search query cannot be empty",
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        profilePic: true,
        lastActive: true,
      },
    });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No users found in the database",
      });
    }

    const fuseOptions = {
      isCaseSensitive: false,
      includeScore: true,
      shouldSort: true,
      keys: [
        { name: "name", weight: 0.4 },
        { name: "email", weight: 0.3 },
        { name: "id", weight: 0.2 },
        { name: "profilePic", weight: 0.1 },
      ],
      threshold: 0.4,
    };

    const fuse = new Fuse(users, fuseOptions);
    const searchResults = fuse
      .search(query)
      .slice(0, limit)
      .filter((searchResult) => searchResult.item.id != user.id);

    return res.status(200).json(searchResults);
  } catch (error) {
    console.error("Error in searchUsers:", error);

    if (
      error instanceof Error &&
      error.name === "PrismaClientKnownRequestError"
    ) {
      return res.status(500).json({
        success: false,
        error: "Database error occurred",
      });
    }

    return res.status(500).json({
      success: false,
      error: "An internal server error occurred",
    });
  }
};
