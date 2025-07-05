import jwt from "jsonwebtoken"
import dotenv from "dotenv"
dotenv.config()
const isAuth=async (req,res,next)=>{
    try {
        let {token}=req.cookies

        if(!token){
            return res.status(401).json({message:"Authentication required"})
        }
        let verifyToken= jwt.verify(token,process.env.JWT_SECRET)
        if(!verifyToken){
            return res.status(401).json({message:"Invalid or expired token"})
        }
        
        req.userId=verifyToken.userId
        next()
    } catch (error) {
        console.log(error)
        return res.status(401).json({message:"Authentication failed"})
    }
}

export default isAuth