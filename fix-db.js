import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixDatabase = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ Connected to database");

        const db = mongoose.connection.db;
        const conversationsCollection = db.collection('conversations');

        // List all indexes
        console.log("Current indexes:");
        const indexes = await conversationsCollection.indexes();
        indexes.forEach(index => {
            console.log("-", index.name, index.key);
        });

        // Drop the problematic index
        try {
            await conversationsCollection.dropIndex('participants_1');
            console.log("✅ Dropped participants_1 index");
        } catch (error) {
            console.log("ℹ️ Index doesn't exist:", error.message);
        }

        // Create new index
        await conversationsCollection.createIndex(
            { participants: 1 }, 
            { 
                unique: true,
                name: 'participants_unique'
            }
        );
        console.log("✅ Created new participants index");

        console.log("✅ Database fixed!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

fixDatabase(); 