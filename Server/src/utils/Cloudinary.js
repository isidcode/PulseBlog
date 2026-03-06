import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const cloudinaryUploader = async (localFilePath)=>{
    try {
        if(!localFilePath){
            throw new Error("local file path does not exist")
        }
        
        const response = await cloudinary.uploader.upload(
            localFilePath,
            {
                resourceType:"auto",
                folder:"PulseBlogAssets"
            }
        )
        //his response url will go to controller that calls it based on
        //  response he decides to store it in db or not.
        console.log("returned url from cloudinary after uploading image",response)
        fs.unlinkSync(localFilePath);
        return response
        
    } 
    catch (error) {
        console.error("cloudinary error while uploading files",error.message)
        if(fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath)
        }
        return null;
    }
}

export {cloudinaryUploader}