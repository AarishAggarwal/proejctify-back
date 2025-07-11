import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixIndexFinal = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ Connected to database");

        const db = mongoose.connection.db;
        const conversationsCollection = db.collection('conversations');

        // Drop existing index
        try {
            await conversationsCollection.dropIndex('participants_unique');
            console.log("✅ Dropped existing index");
        } catch (error) {
            console.log("ℹ️ Index doesn't exist:", error.message);
        }

        // Create a compound index that ensures uniqueness
        await conversationsCollection.createIndex(
            { 
                "participants.0": 1, 
                "participants.1": 1 
            }, 
            { 
                unique: true,
                name: 'participants_pair_unique'
            }
        );
        console.log("✅ Created compound index on participants[0] and participants[1]");

        // Also create a reverse index to handle different orders
        await conversationsCollection.createIndex(
            { 
                "participants.1": 1, 
                "participants.0": 1 
            }, 
            { 
                unique: true,
                name: 'participants_pair_reverse_unique'
            }
        );
        console.log("✅ Created reverse compound index");

        // List all indexes
        console.log("\nAll indexes:");
        const indexes = await conversationsCollection.indexes();
        indexes.forEach(index => {
            console.log("-", index.name, index.key);
        });

        console.log("✅ Index fix completed!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

fixIndexFinal(); 