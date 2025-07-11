import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    participants: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }],
        validate: {
            validator: function(v) {
                return Array.isArray(v) && v.length === 2;
            },
            message: 'Conversation must have exactly 2 participants'
        }
    },
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
    console.log("Participants type:", Array.isArray(this.participants));
    
    if (!Array.isArray(this.participants) || this.participants.length !== 2) {
        console.error("Invalid participants:", this.participants);
        return next(new Error('Conversation must have exactly 2 participants'));
    }
    // Sort participants to ensure consistent ordering for unique index
    this.participants.sort();
    console.log("Sorted participants:", this.participants);
    next();
});

// Note: Indexes are managed manually via scripts to avoid conflicts

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation; 