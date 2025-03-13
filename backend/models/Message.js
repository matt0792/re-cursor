import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true,
    index: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  senderRole: {
    type: String,
    enum: ["user", "assistant", "system", "tool"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  toolCalls: {
    type: Array,
    default: [],
  },
  toolCallId: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  bookmarked: {
    type: Boolean,
    default: false,
  },
});

// Create indexes for faster querying
messageSchema.index({ conversationId: 1, timestamp: 1 });

export default mongoose.model("Message", messageSchema);
