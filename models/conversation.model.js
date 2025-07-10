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
    console.log("Pre-save hook - participants:", this.participants);
    console.log("Participants length:", this.participants.length);
    
    if (this.participants.length !== 2) {
        console.error("Invalid participants length:", this.participants.length);
        return next(new Error('Conversation must have exactly 2 participants'));
    }
    // Sort participants to ensure consistent ordering for unique index
    this.participants.sort();
    console.log("Sorted participants:", this.participants);
    next();
});

// Create a unique index for participants to prevent duplicate conversations
// Sort participants to ensure consistent ordering regardless of insertion order
conversationSchema.index({ participants: 1 }, { 
    unique: true,
    // Custom index function to ensure participants are always sorted
    partialFilterExpression: { participants: { $size: 2 } }
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation; 