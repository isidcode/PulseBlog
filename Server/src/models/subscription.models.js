import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import {User} from "./user.models.js"
const subscriptionSchema = new Schema(
    {
        subscriber:{
            type:Schema.Types.ObjectId,
            ref:"User",
            required:true
        },
        channel:{
            type:Schema.Types.ObjectId,
            ref:"User",
            required:true
        }
    },
    {timestamps:true}
)
subscriptionSchema.plugin(mongooseAggregatePaginate)
export const subscription = mongoose.model("subscription",subscriptionSchema)
