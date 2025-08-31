import genToken from "../config/token.js"
import User from "../models/user.model.js"
import bcrypt from "bcryptjs"
import Post from "../models/post.model.js"
import Connection from "../models/connection.model.js"
import Conversation from "../models/conversation.model.js"
import Message from "../models/message.model.js"
import Notification from "../models/notification.model.js"
import crypto from "crypto"

// Clear all database collections (for development only)
export const clearDatabase = async (req, res) => {
    try {
        await User.deleteMany({})
        await Post.deleteMany({})
        await Connection.deleteMany({})
        await Conversation.deleteMany({})
        await Message.deleteMany({})
        await Notification.deleteMany({})
        
        return res.status(200).json({ message: "Database cleared successfully" })
    } catch (error) {
        console.log("Clear database error:", error)
        return res.status(500).json({ message: "Failed to clear database" })
    }
}

export const signUp=async (req,res)=>{
    try {
        const {firstName,lastName,userName,email,password}=req.body
        
        // Validate required fields
        if(!firstName || !lastName || !userName || !email || !password){
            return res.status(400).json({message:"All fields are required: firstName, lastName, userName, email, password"})
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(email)){
            return res.status(400).json({message:"Please enter a valid email address"})
        }
        
        // Validate password length
        if(password.length<8){
            return res.status(400).json({message:"password must be at least 8 characters"})
        }
        
        // Validate username format (alphanumeric and underscores only)
        const usernameRegex = /^[a-zA-Z0-9_]+$/
        if(!usernameRegex.test(userName)){
            return res.status(400).json({message:"Username can only contain letters, numbers, and underscores"})
        }
        
        // Check if email already exists
        let existEmail=await User.findOne({email})
        if(existEmail){
            return res.status(400).json({message:"Email already exists!"})
        }
        
        // Check if username already exists
        let existUsername=await User.findOne({userName})
        if(existUsername){
            return res.status(400).json({message:"Username already exists!"})
        }
      
        let hassedPassword=await bcrypt.hash(password,10)
      
        const user=await User.create({
            firstName,
            lastName,
            userName,
            email,
            password:hassedPassword
        })

        let token=await genToken(user._id)
        res.cookie("token",token,{
            httpOnly:true,
            maxAge:7*24*60*60*1000,
            sameSite:"none",
            secure:true
        })
        return res.status(201).json(user)

    } catch (error) {
        console.log("Signup error:", error);
        if(error.name === 'ValidationError'){
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({message: errors.join(', ')})
        }
        return res.status(500).json({message:"Signup error occurred"})
    }
}

export const login=async (req,res)=>{
    try {
        const {email,password}=req.body
        let user=await User.findOne({email})
        if(!user){
         return res.status(400).json({message:"user does not exist !"})
        }

       const isMatch=await bcrypt.compare(password,user.password)
       if(!isMatch){
        return res.status(400).json({message:"incorrect password"})
       }
   
        let token=await genToken(user._id)
        res.cookie("token",token,{
         httpOnly:true,
         maxAge:7*24*60*60*1000,
         sameSite:"none",
         secure:true
        })
       return res.status(200).json(user)
    } catch (error) {
        console.log(error);
        return res.status(500).json({message:"login error"})
    }
}

export const logOut=async (req,res)=>{
    try {
        res.clearCookie("token")
        return res.status(200).json({message:"log out successfully"})
    } catch (error) {
        console.log(error);
        return res.status(500).json({message:"logout error"})
    }
}

// Forgot Password - Send reset email
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found with this email" });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour

        // Save reset token to user
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiry = resetTokenExpiry;
        await user.save();

        // Create reset URL
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        
        // Email content
        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3b82f6; text-align: center;">Password Reset Request</h2>
                <p>Hello ${user.firstName},</p>
                <p>You requested a password reset for your Projectify account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a>
                </div>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <p>Best regards,<br>The Projectify Team</p>
            </div>
        `;

        // Send email (you'll need to implement email service)
        // For now, we'll just return the reset URL
        // In production, use nodemailer or similar service
        
        res.status(200).json({ 
            message: "Password reset email sent successfully",
            resetUrl: resetUrl, // Remove this in production
            note: "In production, this URL will be sent via email"
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Reset Password - Verify token and update password
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ message: "Token and new password are required" });
        }

        // Find user by reset token
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Update user password and clear reset token
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Verify Reset Token
export const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        res.status(200).json({ message: "Token is valid", email: user.email });

    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};