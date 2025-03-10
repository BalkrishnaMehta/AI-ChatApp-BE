import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  generateAuthTokens,
  setRefreshTokenCookie,
} from "../utils/auth.utils.js";

const prisma = new PrismaClient();

const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;
const environment = process.env.ENV;

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, profilePic } = req.body;

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, profilePic },
    });

    const { accessToken, refreshToken } = generateAuthTokens({ id: user.id });
    setRefreshTokenCookie(res, refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return res.status(201).json({ accessToken, user: { id: user.id } });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = generateAuthTokens({ id: user.id });
    setRefreshTokenCookie(res, refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return res.status(200).json({ accessToken, user: { id: user.id } });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const receivedRefreshToken = req.cookies.refreshToken;

    if (!receivedRefreshToken) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    const decoded = jwt.verify(receivedRefreshToken, jwtRefreshSecret) as {
      id: string;
    };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.refreshToken !== receivedRefreshToken) {
      res.clearCookie("refreshToken");
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateAuthTokens({
      id: user.id,
    });
    setRefreshTokenCookie(res, newRefreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return res.status(200).json({ accessToken, user: { id: user.id } });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.clearCookie("refreshToken");
    return res.status(401).json({ error: "Invalid refresh token" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ error: "No refresh token provided" });
    }

    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as {
      id: string;
    };

    await prisma.user.update({
      where: { id: decoded.id },
      data: { refreshToken: null },
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: environment === "production",
      sameSite: "strict",
      // sameSite: "none",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
