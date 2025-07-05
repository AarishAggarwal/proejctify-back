import genToken from "../config/token.js"
import User from "../models/user.model.js"
import bcrypt from "bcryptjs"
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
            sameSite:"strict",
            secure:process.env.NODE_ENVIRONMENT==="production"
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
         sameSite:"strict",
         secure:process.env.NODE_ENVIRONMENT==="production"
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