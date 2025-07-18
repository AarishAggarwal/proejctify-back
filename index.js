import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import authRouter from "./routes/auth.routes.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import userRouter from "./routes/user.routes.js"
import postRouter from "./routes/post.routes.js"
import connectionRouter from "./routes/connection.routes.js"
import http from "http"
import { Server } from "socket.io"
import notificationRouter from "./routes/notification.routes.js"
import chatRouter from "./routes/chat.routes.js"
import chatbotProxyRouter from "./chatbot-proxy.js"
dotenv.config()
let app=express()
let server=http.createServer(app)

const allowedOrigins = [
  "http://localhost:5173",
  "https://projectifyfinal-7ni4.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
};

export const io=new Server(server,{
    cors: corsOptions
})
app.use(express.json())
app.use(cookieParser())
app.use(cors(corsOptions))
let port=process.env.PORT || 5000
app.use("/api/auth",authRouter)
app.use("/api/user",userRouter)
app.use("/api/post",postRouter)
app.use("/api/connection",connectionRouter)
app.use("/api/notification",notificationRouter)
app.use("/api/chat",chatRouter)
app.use(chatbotProxyRouter)
export const userSocketMap=new Map()
io.on("connection",(socket)=>{

   socket.on("register",(userId)=>{
    userSocketMap.set(userId,socket.id)
 console.log(userSocketMap)
   })
   
   // Handle chat messages
   socket.on("send_message", async (data) => {
    try {
        const { conversationId, content, receiverId } = data;
        
        // Find receiver's socket
        const receiverSocketId = userSocketMap.get(receiverId);
        
        if (receiverSocketId) {
            // Send message to receiver
            io.to(receiverSocketId).emit("new_message", {
                conversationId,
                content,
                senderId: socket.userId // This will be set when user registers
            });
        }
    } catch (error) {
        console.error("Socket message error:", error);
    }
   });
   
   socket.on("disconnect",(socket)=>{
    for (let [key, value] of userSocketMap.entries()) {
        if (value === socket.id) {
            userSocketMap.delete(key);
        }
    }
    console.log("User disconnected:", socket.id);
});
   }) 


server.listen(port,()=>{
    connectDb()
    console.log("server started");
})


