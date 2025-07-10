import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixConversationIndex = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ Connected to database");

        // Get the conversations collection
        const db = mongoose.connection.db;
        const conversationsCollection = db.collection('conversations');

        // Drop the existing problematic index
        try {
            await conversationsCollection.dropIndex('participants_1');
            console.log("✅ Dropped existing participants index");
        } catch (error) {
            console.log("ℹ️ Index doesn't exist or already dropped:", error.message);
        }

        // Create the new proper index
        await conversationsCollection.createIndex(
            { participants: 1 }, 
            { 
                unique: true,
                partialFilterExpression: { participants: { $size: 2 } }
            }
        );
        console.log("✅ Created new participants index");

        // Also create a compound index for better querying
        await conversationsCollection.createIndex(
            { participants: 1, lastMessageTime: -1 }
        );
        console.log("✅ Created compound index for better performance");

        console.log("✅ All indexes fixed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error fixing indexes:", error);
        process.exit(1);
    }
};

fixConversationIndex(); 