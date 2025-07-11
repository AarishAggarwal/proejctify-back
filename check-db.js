import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const checkDatabase = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ Connected to database");

        const db = mongoose.connection.db;
        const conversationsCollection = db.collection('conversations');

        // Find all conversations
        const allConversations = await conversationsCollection.find({}).toArray();
        console.log(`Found ${allConversations.length} conversations`);

        console.log("\n=== ALL CONVERSATIONS ===");
        allConversations.forEach((conv, index) => {
            console.log(`${index + 1}. ID: ${conv._id}`);
            console.log(`   Participants: ${JSON.stringify(conv.participants)}`);
            console.log(`   Participants type: ${typeof conv.participants}`);
            console.log(`   Is array: ${Array.isArray(conv.participants)}`);
            console.log(`   Length: ${conv.participants ? conv.participants.length : 'N/A'}`);
            console.log("---");
        });

        // Check for conversations with only one participant
        const singleParticipantConvs = allConversations.filter(conv => 
            !Array.isArray(conv.participants) || conv.participants.length === 1
        );

        if (singleParticipantConvs.length > 0) {
            console.log(`\n❌ Found ${singleParticipantConvs.length} conversations with only one participant:`);
            singleParticipantConvs.forEach(conv => {
                console.log(`   ID: ${conv._id}, Participants: ${JSON.stringify(conv.participants)}`);
            });
        } else {
            console.log("\n✅ No conversations with single participants found");
        }

        // Check for conversations between the specific users
        const targetUsers = ['68691fccbe95f0d3c2d87b20', '686fc5f2518649fe2bfb6906'];
        const relevantConvs = allConversations.filter(conv => {
            if (Array.isArray(conv.participants)) {
                return conv.participants.some(p => targetUsers.includes(p.toString()));
            }
            return targetUsers.includes(conv.participants?.toString());
        });

        console.log(`\n=== CONVERSATIONS INVOLVING TARGET USERS ===`);
        relevantConvs.forEach((conv, index) => {
            console.log(`${index + 1}. ID: ${conv._id}`);
            console.log(`   Participants: ${JSON.stringify(conv.participants)}`);
        });

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

checkDatabase(); 