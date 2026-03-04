import dotenv from "dotenv";
dotenv.config()
import mongoose from "mongoose"
const connectDb = async ()=>{
    try {
        const URL = process.env.MONGO_URL;
        console.log(URL);
        const connectionInstance = await mongoose.connect(URL);
        console.log("database is trying to connect host",`${connectionInstance.connection.host}`);
        console.log("database successfully connected");
    } 
    catch (error) {
        console.log(error,"❌ MONGODB CONNECTION ERROR:");
        process.exit(1);
    }
    

}


export {connectDb}