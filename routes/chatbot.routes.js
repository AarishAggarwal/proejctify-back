import express from "express";
import { chatbotResponse } from "../controllers/chatbot.controllers.js";

const chatbotRouter = express.Router();

chatbotRouter.post("/", chatbotResponse);

export default chatbotRouter; 