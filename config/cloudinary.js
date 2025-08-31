import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

const uploadOnCloudinary = async (filePath) => {
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });

    try {
        if (!filePath) {
            return null;
        }

        let uploadResult;
        
        // Check if it's a base64 data URI
        if (filePath.startsWith('data:')) {
            // Upload base64 data URI directly
            uploadResult = await cloudinary.uploader.upload(filePath, {
                resource_type: 'auto'
            });
        } else {
            // Upload file path
            uploadResult = await cloudinary.uploader.upload(filePath);
            // Only unlink if it's a file path
            fs.unlinkSync(filePath);
        }
        
        return uploadResult.secure_url;

    } catch (error) {
        // Only unlink if it's a file path and not a data URI
        if (filePath && !filePath.startsWith('data:') && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        console.log(error);
        throw error;
    }
}

export default uploadOnCloudinary