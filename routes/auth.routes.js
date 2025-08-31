import express from "express"
import { login, logOut, signUp, clearDatabase, forgotPassword, resetPassword, verifyResetToken } from "../controllers/auth.controllers.js"

let authRouter=express.Router()

authRouter.post("/signup",signUp)
authRouter.post("/login",login)
authRouter.get("/logout",logOut)
authRouter.delete("/clear-database", clearDatabase)

// Forgot Password Routes
authRouter.post("/forgot-password", forgotPassword)
authRouter.post("/reset-password", resetPassword)
authRouter.get("/verify-reset-token/:token", verifyResetToken)

export default authRouter