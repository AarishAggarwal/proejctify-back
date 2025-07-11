import express from "express";
import { chatbotResponse, chatbotTest } from "../controllers/chatbot.controllers.js";

const chatbotRouter = express.Router();

chatbotRouter.get("/test", chatbotTest);
chatbotRouter.post("/", chatbotResponse);

export default chatbotRouter; 