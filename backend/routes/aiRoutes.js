import express from "express";
const router = express.Router();
import { answer, getTools } from "../controllers/aiController.js";
import { getConversationHistory } from "../middleware/messageLogging.js";
import { verifyToken } from "../middleware/auth.js";

// routes
router.post("/answer", answer);
router.get("/tools", getTools);

router.get("/id/:conversationId", verifyToken(), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit } = req.query;

    const messages = await getConversationHistory(
      conversationId,
      limit ? parseInt(limit) : 20
    );

    res.json(messages);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Failed to fetch conversation history" });
  }
});

// Add an endpoint to delete conversation history if needed
router.delete("/delete/:conversationId", verifyToken(), async (req, res) => {
  try {
    const { conversationId } = req.params;

    await Message.deleteMany({ conversationId });

    res.json({ message: "Conversation history deleted successfully" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ error: "Failed to delete conversation history" });
  }
});

export default router;
