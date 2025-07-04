import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    },
    lastMessageTime: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensure participants array has exactly 2 users
conversationSchema.pre('save', function(next) {
    if (this.participants.length !== 2) {
        return next(new Error('Conversation must have exactly 2 participants'));
    }
    next();
});

// Create a unique index for participants to prevent duplicate conversations
conversationSchema.index({ participants: 1 }, { unique: true });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation; 