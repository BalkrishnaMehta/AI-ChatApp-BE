import { Router } from "express";
import authRoutes from "./auth.js";
import userRoutes from "./user.js";
import chatRoutes from "./chat.js";
import conversationRoutes from "./conversation.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/chat", chatRoutes);
router.use("/conversations", conversationRoutes);

export default router;
