import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixRenderDatabase = async () => {
    try {
        console.log("Connecting to Render database...");
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ Connected to database");

        const db = mongoose.connection.db;
        const conversationsCollection = db.collection('conversations');

        // List all current indexes
        console.log("Current indexes:");
        const currentIndexes = await conversationsCollection.indexes();
        currentIndexes.forEach(index => {
            console.log("-", index.name, index.key);
        });

        // Drop the problematic index
        try {
            await conversationsCollection.dropIndex('participants_unique');
            console.log("✅ Dropped participants_unique index");
        } catch (error) {
            console.log("ℹ️ Index doesn't exist or already dropped:", error.message);
        }

        // Drop any other participants indexes
        try {
            await conversationsCollection.dropIndex('participants_1');
            console.log("✅ Dropped participants_1 index");
        } catch (error) {
            console.log("ℹ️ Index doesn't exist:", error.message);
        }

        // Create the new compound index
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
        console.log("✅ Created participants_pair_unique index");

        // Verify the new indexes
        console.log("\nNew indexes:");
        const newIndexes = await conversationsCollection.indexes();
        newIndexes.forEach(index => {
            console.log("-", index.name, index.key);
        });

        console.log("✅ Render database fixed!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

fixRenderDatabase(); 