import Message from "../models/Message.js"; // Adjust the path as needed

// Function to log a message to the database
export const logMessage = async (messageData) => {
  try {
    // Create a new message document
    const message = new Message({
      senderId: messageData.senderId,
      senderName: messageData.senderName || "Unknown",
      senderRole: messageData.senderRole,
      content: messageData.content || messageData.message,
      toolCalls: messageData.toolCalls || [],
      toolCallId: messageData.toolCallId || null,
      conversationId: messageData.conversationId || messageData.senderId, // Fallback to senderId if no conversationId
      timestamp: new Date(),
      bookmarked: false,
    });

    // Save the message to the database
    await message.save();
    return message;
  } catch (error) {
    console.error("Error logging message:", error);
    // Don't throw the error to prevent breaking the main application flow
    return null;
  }
};

// Function to retrieve conversation history
export const getConversationHistory = async (conversationId, limit = 50) => {
  try {
    const messages = await Message.find({ conversationId })
      .sort({ timestamp: 1 })
      .limit(limit);
    return messages;
  } catch (error) {
    console.error("Error retrieving conversation history:", error);
    return [];
  }
};
