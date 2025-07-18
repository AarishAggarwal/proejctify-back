import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
    checkConnection,
    getConversations,
    getOrCreateConversation,
    getMessages,
    sendMessage,
    markAsRead,
    getUnreadCount
} from "../controllers/chat.controllers.js";

const router = express.Router();

// All routes require authentication
router.use(isAuth);

// Check if two users are connected
router.get("/connection/:userId", checkConnection);

// Get all conversations for current user
router.get("/conversations", getConversations);

// Get or create conversation with a specific user
router.get("/conversation/:userId", getOrCreateConversation);

// Get messages for a conversation
router.get("/messages/:conversationId", getMessages);

// Send a message
router.post("/message", sendMessage);

// Mark messages as read
router.put("/read/:conversationId", markAsRead);

// Get unread message count
router.get("/unread-count", getUnreadCount);

export default router; 