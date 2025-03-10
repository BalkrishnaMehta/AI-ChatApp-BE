import { Router } from "express";
import { searchUsers } from "../controllers/user.js";
import { authenticateToken } from "../middlewares/authenticateToken.js";

const router = Router();

router.get("/search", authenticateToken, searchUsers);

export default router;
