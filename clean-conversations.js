import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const cleanConversations = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ Connected to database");

        const db = mongoose.connection.db;
        const conversationsCollection = db.collection('conversations');

        // Find all conversations
        const allConversations = await conversationsCollection.find({}).toArray();
        console.log(`Found ${allConversations.length} conversations`);

        // Check for malformed conversations
        const malformedConversations = [];
        allConversations.forEach(conv => {
            console.log("Conversation:", conv._id, "Participants:", conv.participants);
            
            if (!Array.isArray(conv.participants) || conv.participants.length !== 2) {
                malformedConversations.push(conv._id);
                console.log("❌ Malformed conversation found:", conv._id);
            }
        });

        if (malformedConversations.length > 0) {
            console.log(`Found ${malformedConversations.length} malformed conversations`);
            console.log("Deleting malformed conversations...");
            
            const result = await conversationsCollection.deleteMany({
                _id: { $in: malformedConversations }
            });
            
            console.log(`✅ Deleted ${result.deletedCount} malformed conversations`);
        } else {
            console.log("✅ No malformed conversations found");
        }

        // Check for duplicate conversations between the same users
        const duplicates = [];
        const seenPairs = new Set();

        allConversations.forEach(conv => {
            if (Array.isArray(conv.participants) && conv.participants.length === 2) {
                const sortedParticipants = conv.participants.sort().map(p => p.toString());
                const pairKey = sortedParticipants.join('-');
                
                if (seenPairs.has(pairKey)) {
                    duplicates.push(conv._id);
                    console.log("❌ Duplicate conversation found:", conv._id);
                } else {
                    seenPairs.add(pairKey);
                }
            }
        });

        if (duplicates.length > 0) {
            console.log(`Found ${duplicates.length} duplicate conversations`);
            console.log("Deleting duplicate conversations...");
            
            const result = await conversationsCollection.deleteMany({
                _id: { $in: duplicates }
            });
            
            console.log(`✅ Deleted ${result.deletedCount} duplicate conversations`);
        } else {
            console.log("✅ No duplicate conversations found");
        }

        console.log("✅ Database cleanup completed!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

cleanConversations(); 