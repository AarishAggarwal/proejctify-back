import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const recreateIndexes = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ Connected to database");

        const db = mongoose.connection.db;
        const conversationsCollection = db.collection('conversations');

        // List current indexes
        console.log("Current indexes:");
        const currentIndexes = await conversationsCollection.indexes();
        currentIndexes.forEach(index => {
            console.log("-", index.name, index.key);
        });

        // Drop ALL indexes except _id
        console.log("\nDropping all indexes except _id...");
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

        // Create new index
        console.log("\nCreating new participants index...");
        await conversationsCollection.createIndex(
            { participants: 1 }, 
            { 
                unique: true,
                name: 'participants_unique'
            }
        );
        console.log("✅ Created participants_unique index");

        // Verify the new index
        console.log("\nNew indexes:");
        const newIndexes = await conversationsCollection.indexes();
        newIndexes.forEach(index => {
            console.log("-", index.name, index.key);
        });

        console.log("✅ Index recreation completed!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

recreateIndexes(); 