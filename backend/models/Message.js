import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Conversation",
  },
  sender: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
  },
  message: {
    text: { type: String, required: true },
  },
  timestamp: { type: Date, default: Date.now },
  metadata: {
    toolUsed: { type: String, default: null },
    language: { type: String, default: "en" },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
});

// Create an index for fast conversation queries
messageSchema.index({ conversationId: 1, timestamp: 1 });

export const Message = mongoose.model("Message", messageSchema);
