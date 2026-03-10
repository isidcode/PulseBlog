import mongoose,{Schema} from "mongoose";
import { User } from "./user.models";
const postSchema = new Schema(
    {
        title:{
            type:String,
            required:true,
            index:true,
            trim:true
        },
        content:{
            type:String,
            required:true,
            
        },
        mediaImage:{
            type:String,
            required:true,  
        },

        owner:{
            type:Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        views:{
            type:Number,
            default:0,
        },
        //tags defailt [] to prevent frontend errors when ther is no post
        tags:{
            type:[String],
            default:[]
        },
        isPublished:{
            type:Boolean,
            default:false
        }


    },
    {timestamps:true}
)

//for search bar using title
postSchema.index({ title: 'text', content: 'text' });
export const post = mongoose.model("post",postSchema)