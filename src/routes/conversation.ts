import { Router } from "express";
import {
  getConversations,
  getMessagesByConversationId,
  getMessagesWithBot,
} from "../controllers/conversation.js";
import { authenticateToken } from "../middlewares/authenticateToken.js";

const router = Router();

router.get("/", authenticateToken, getConversations);
router.get("/bot/messages", authenticateToken, getMessagesWithBot);
router.get("/:id/messages", authenticateToken, getMessagesByConversationId);

export default router;
