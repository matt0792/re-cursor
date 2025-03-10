import express from "express";
const router = express.Router();
import { answer, getTools } from "../controllers/aiController.js";

// routes
router.post("/answer", answer);
router.get("/tools", getTools);

export default router;
