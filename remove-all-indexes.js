import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const removeAllIndexes = async () => {
    try {
        console.log("Connecting to database...");
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

        // Remove ALL indexes except _id
        console.log("\nRemoving all indexes except _id...");
        for (const index of currentIndexes) {
            if (index.name !== '_id_') {
                try {
                    await conversationsCollection.dropIndex(index.name);
                    console.log(`✅ Dropped index: ${index.name}`);
                } catch (error) {
                    console.log(`ℹ️ Could not drop ${index.name}:`, error.message);
                }
            }
        }

        // Wait a moment for indexes to be fully dropped
        console.log("Waiting for indexes to be dropped...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create a simple index without unique constraint first
        console.log("\nCreating simple index...");
        await conversationsCollection.createIndex(
            { participants: 1 }, 
            { 
                name: 'participants_simple'
            }
        );
        console.log("✅ Created simple participants index");

        // List final indexes
        console.log("\nFinal indexes:");
        const finalIndexes = await conversationsCollection.indexes();
        finalIndexes.forEach(index => {
            console.log("-", index.name, index.key);
        });

        console.log("✅ All indexes removed and recreated!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

removeAllIndexes(); 