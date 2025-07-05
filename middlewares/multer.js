import multer from "multer"

// Use memory storage instead of disk storage to avoid file system issues on Render
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
})

export default upload
