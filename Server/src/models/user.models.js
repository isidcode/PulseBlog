import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
const userSchema = new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            trim:true,
            lowercase:true,
            index:true,
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullname:{
            type:String,
            required:true,
            lowercase:true,
            trim:true,
        },
        password:{
            type:String,
            required:true,
        },
        bio:{
            type:String,
            lowercase:true,
        },
        avatar:{
            type:String,
        },
        
        refreshToken:{
            type:String,
        },

        tokenversion:{
            type:Number,
            default:0
        }
    },
    {timestamps:true}
)



//this hook prevents password hashing for every user operation
userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password,10);
});

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password);
};

userSchema.methods.genearateAccessToken = function(){
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const expiry = process.env.ACCESS_TOKEN_EXPIRY;

    if(!secret){
        throw new error(401,"Jwt secret code is not found")
    }

    return jwt.sign(
        {
            _id: this.id,
            email: this.email,
            username:this.username
        },
        secret,
        {
            expiresIn:expiry
        }
    );
};

userSchema.methods.genearateRefreshToken =  function(){
    const secret = process.env.REFRESH_TOKEN_SECRET;
    const expiry = process.env.REFRESH_TOKEN_EXPIRY;

    if(!secret){
        throw new error(401,"Jwt secret code is not found")
    }

    return jwt.sign(
        {
            _id: this.id,
        },
        secret,
        {
            expiresIn:expiry
        }
    );
};

export const User = mongoose.model("User",userSchema)
