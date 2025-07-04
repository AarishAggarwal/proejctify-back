import mongoose from "mongoose";

const connectDb=async ()=>{
    try {
      if (!process.env.MONGODB_URL) {
        console.error("❌ MONGODB_URL environment variable is not set!");
        console.error("Please create a .env file in the backend directory with your MongoDB connection string.");
        process.exit(1);
      }
      
      await mongoose.connect(process.env.MONGODB_URL)
        console.log("✅ Database connected successfully")
    } catch (error) {
        console.error("❌ Database connection error:", error.message);
        console.error("Please check your MongoDB connection string and network connectivity.");
        process.exit(1);
    }
}
export default connectDb