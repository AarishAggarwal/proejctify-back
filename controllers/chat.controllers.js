import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Connection from "../models/connection.model.js";
import User from "../models/user.model.js";

// Check if two users are connected
export const checkConnection = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.userId;

        if (currentUserId === userId) {
            return res.status(400).json({ message: "Cannot check connection with yourself" });
        }

        const connection = await Connection.findOne({
            $or: [
                { sender: currentUserId, receiver: userId },
                { sender: userId, receiver: currentUserId }
            ],
            status: "accepted"
        });

        res.status(200).json({ 
            isConnected: !!connection,
            connection: connection 
        });
    } catch (error) {
        console.error("Check connection error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all conversations for current user
export const getConversations = async (req, res) => {
    try {
        const currentUserId = req.userId;

        const conversations = await Conversation.find({
            participants: currentUserId
        })
        .populate('participants', 'firstName lastName profileImage')
        .populate('lastMessage', 'content createdAt sender')
        .sort({ lastMessageTime: -1 });

        res.status(200).json(conversations);
    } catch (error) {
        console.error("Get conversations error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get or create conversation between two users
export const getOrCreateConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.userId;

        console.log("Creating conversation between:", { currentUserId, userId });

        if (currentUserId === userId) {
            return res.status(400).json({ message: "Cannot create conversation with yourself" });
        }

        // Check if users are connected
        const connection = await Connection.findOne({
            $or: [
                { sender: currentUserId, receiver: userId },
                { sender: userId, receiver: currentUserId }
            ],
            status: "accepted"
        });

        if (!connection) {
            return res.status(403).json({ message: "You can only message your connections" });
        }

        // Find existing conversation or create new one
        // Use $all to find conversations with both participants regardless of order
        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, userId] }
        }).populate('participants', 'firstName lastName profileImage');

        if (!conversation) {
            console.log("No existing conversation found, creating new one...");
            console.log("Participants to add:", [currentUserId, userId]);
            
            try {
                conversation = new Conversation({
                    participants: [currentUserId, userId]
                });
                
                console.log("Conversation object before save:", conversation);
                console.log("Participants array:", conversation.participants);
                
                await conversation.save();
                console.log("✅ Conversation saved successfully!");
                conversation = await conversation.populate('participants', 'firstName lastName profileImage');
            } catch (error) {
                console.error("Error saving conversation:", error);
                
                // If it's a duplicate key error, try to find the existing conversation
                if (error.code === 11000) {
                    console.log("Duplicate key error, trying to find existing conversation...");
                    conversation = await Conversation.findOne({
                        participants: { $all: [currentUserId, userId] }
                    }).populate('participants', 'firstName lastName profileImage');
                    
                    if (!conversation) {
                        console.error("Duplicate key error but conversation not found:", error);
                        return res.status(500).json({ message: "Error creating conversation - please try again" });
                    }
                    console.log("Found existing conversation after duplicate key error");
                } else {
                    console.error("Unexpected error creating conversation:", error);
                    return res.status(500).json({ message: "Error creating conversation" });
                }
            }
        }

        res.status(200).json(conversation);
    } catch (error) {
        console.error("Get or create conversation error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get messages for a conversation
export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const currentUserId = req.userId;

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUserId
        });

        if (!conversation) {
            return res.status(403).json({ message: "Access denied" });
        }

        const messages = await Message.find({ conversationId })
            .populate('sender', 'firstName lastName profileImage')
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error("Get messages error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Send a message
export const sendMessage = async (req, res) => {
    try {
        const { conversationId, content } = req.body;
        const currentUserId = req.userId;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Message content is required" });
        }

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUserId
        });

        if (!conversation) {
            return res.status(403).json({ message: "Access denied" });
        }

        const message = new Message({
            conversationId,
            sender: currentUserId,
            content: content.trim()
        });

        await message.save();

        // Update conversation's last message
        conversation.lastMessage = message._id;
        conversation.lastMessageTime = new Date();
        await conversation.save();

        const populatedMessage = await message.populate('sender', 'firstName lastName profileImage');

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error("Send message error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const currentUserId = req.userId;

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUserId
        });

        if (!conversation) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Mark all unread messages from other users as read
        await Message.updateMany(
            {
                conversationId,
                sender: { $ne: currentUserId },
                isRead: false
            },
            {
                isRead: true,
                readAt: new Date()
            }
        );

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.error("Mark as read error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
    try {
        const currentUserId = req.userId;

        const unreadCount = await Message.countDocuments({
            sender: { $ne: currentUserId },
            isRead: false,
            conversationId: {
                $in: await Conversation.find({ participants: currentUserId }).distinct('_id')
            }
        });

        res.status(200).json({ unreadCount });
    } catch (error) {
        console.error("Get unread count error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Create new topic/conversation
export const createNewTopic = async (req, res) => {
    try {
        const { userId, topic } = req.body;
        const currentUserId = req.userId;

        if (currentUserId === userId) {
            return res.status(400).json({ message: "Cannot create conversation with yourself" });
        }

        // Check if users are connected
        const connection = await Connection.findOne({
            $or: [
                { sender: currentUserId, receiver: userId },
                { sender: userId, receiver: currentUserId }
            ],
            status: "accepted"
        });

        if (!connection) {
            return res.status(403).json({ message: "You can only message your connections" });
        }

        // Create new conversation with topic
        const conversation = new Conversation({
            participants: [currentUserId, userId],
            topic: topic || "New Topic"
        });

        await conversation.save();
        const populatedConversation = await conversation.populate('participants', 'firstName lastName profileImage');

        res.status(201).json(conversation);
    } catch (error) {
        console.error("Create new topic error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get chat history with search
export const getChatHistory = async (req, res) => {
    try {
        const currentUserId = req.userId;
        const { search, limit = 50, offset = 0 } = req.query;

        let query = { participants: currentUserId };
        
        // Add search functionality
        if (search) {
            query.$or = [
                { topic: { $regex: search, $options: 'i' } },
                { 'messages.content': { $regex: search, $options: 'i' } }
            ];
        }

        const conversations = await Conversation.find(query)
            .populate('participants', 'firstName lastName profileImage')
            .populate('lastMessage', 'content createdAt sender')
            .sort({ lastMessageTime: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));

        // Get total count for pagination
        const totalCount = await Conversation.countDocuments(query);

        res.status(200).json({
            conversations,
            totalCount,
            hasMore: totalCount > parseInt(offset) + conversations.length
        });
    } catch (error) {
        console.error("Get chat history error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Archive conversation
export const archiveConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const currentUserId = req.userId;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUserId
        });

        if (!conversation) {
            return res.status(403).json({ message: "Access denied" });
        }

        conversation.isArchived = true;
        await conversation.save();

        res.status(200).json({ message: "Conversation archived successfully" });
    } catch (error) {
        console.error("Archive conversation error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Unarchive conversation
export const unarchiveConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const currentUserId = req.userId;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUserId
        });

        if (!conversation) {
            return res.status(403).json({ message: "Access denied" });
        }

        conversation.isArchived = false;
        await conversation.save();

        res.status(200).json({ message: "Conversation unarchived successfully" });
    } catch (error) {
        console.error("Unarchive conversation error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update conversation topic
export const updateTopic = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { topic } = req.body;
        const currentUserId = req.userId;

        if (!topic || topic.trim().length === 0) {
            return res.status(400).json({ message: "Topic cannot be empty" });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUserId
        });

        if (!conversation) {
            return res.status(403).json({ message: "Access denied" });
        }

        conversation.topic = topic.trim();
        await conversation.save();

        res.status(200).json(conversation);
    } catch (error) {
        console.error("Update topic error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}; 