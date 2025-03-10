import { Router } from "express";
import { chat, chatWithBot, getSmartReplies } from "../controllers/chat.js";
import { authenticateToken } from "../middlewares/authenticateToken.js";

const router = Router();

router.post("/", authenticateToken, chat);
router.post("/smart-replies", authenticateToken, getSmartReplies);
router.post("/neuron", authenticateToken, chatWithBot);

export default router;
