import { Asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Apierror.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import {User} from "../models/user.models.js";
import {cloudinaryUploader} from "../utils/Cloudinary.js";


const options = {
    httpOnly:true,
    secure:true,
}


const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId);
        //increment existing tokenVersion for new login
        //and automatically makes previous token invalid 
        user.tokenVersion += 1;
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});
        return {accessToken,refreshToken};
    } 
    catch (error) {
        console.error("Actual error",error);
        throw new Apierror(500,"something went wrong while generating tokens")
    }
}

const registerUser = Asynchandler(async (req, res) => {
    const { username, email, password } = req.body;

    // 1. Validate inputs
    if ([username, email, password].some((field) => field?.trim() === "")) {
        throw new Apierror(400, "All fields are required"); // Changed to 400 (Bad Request)
    }

    // 2. Check if user already exists
    const userExisted = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (userExisted) {
        throw new Apierror(409, "User with email or username already exists"); // Changed to 409 (Conflict)
    }

    // 3. Handle Avatar (Required)
    const avatarFilepath = req.files?.avatar?.[0]?.path; // Safely chain the array index

    if (!avatarFilepath) {
        throw new Apierror(400, "Avatar file is required");
    }
    
    const avatar = await cloudinaryUploader(avatarFilepath);
    
    if (!avatar) {
        throw new Apierror(500, "Avatar failed to upload to Cloudinary");
    }

    // 4. Handle Cover Image (Optional)
    let coverImageFilePath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageFilePath = req.files.coverImage[0].path;
    }

    let coverImage = null; 
    if (coverImageFilePath) {
        // FIX: Pass the correct file path here!
        coverImage = await cloudinaryUploader(coverImageFilePath); 
        
        if (!coverImage) {
            throw new Apierror(500, "Cover image failed to upload to Cloudinary");
        }
    }

    // 5. Create the user in MongoDB
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        password,
        coverImage: coverImage?.url || "", 
        avatar: avatar.url,
    });

    // 6. Fetch the user back to confirm creation and remove sensitive data
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" 
    );

    if (!createdUser) {
        throw new Apierror(500, "Something went wrong while registering the user");
    }

    // 7. Send success response
    return res
        .status(201)
        .json(
            new Apiresponse(201, "User created successfully", createdUser) 
        );
});

const userLogin = Asynchandler(async (req,res) => {
    const {username,password} = req.body

    if(
        [username,password].some((field) => field?.trim() === "")
    ){
        throw new Apierror(400,"All fields are mandatory");
    }

    const user = await User.findOne({username});

    if(!user){
        throw new Apierror(404,"User does not exist")
    }

    const verifyPassword = await user.isPasswordCorrect(password);

    if(!verifyPassword){
        throw new Apierror(401,"Invalid user credentials");
    }

    const {accessToken,refreshToken} =  await generateAccessAndRefreshToken(user._id);
    
    const loggedUser = await User.findById(user._id)
    .select("-password -refreshToken")

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json( 
        new Apiresponse(
            200,
            {
                user:loggedUser,
                accessToken,
                refreshToken
            },
            "User LoggedIn successfully"
        )
    )
});

const userLogout = Asynchandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined,
            },
            $inc: {
                tokenVersion: 1 
            }
        },
        {
            new:true
        },
    )

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new Apiresponse(200,{},"user logged out successfully")
    )
})

const refreshToken = Asynchandler(async (req,res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        
        if(!incomingRefreshToken){
            throw new Apierror(401,"Unauthorize to access")
        }

        const decodedToken = await Jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id);

        if(!user){
            throw new Apierror(404,"user not found")
        }

        if(incomingRefreshToken !== user?.refreshToken ){
            throw new Apierror(401,"Invalid refreshToken");
        }

        const {newAccessToken,newRefreshToken} = generateAccessAndRefreshToken(user._id);

        

        return res
        .status(200)
        .cookie("accessToken",newAccessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            {
                accessToken:newAccessToken,
                refreshToken:newRefreshToken
            },
            new Apiresponse(200,"access and refresh token generated")
        )
    } 
    catch (error) {
        console.error("refresh token endpont error",error);
    }
})

const getCurrentUser = Asynchandler(async (req,res)=>{
    return res
    .status(200)
    .json(
        
        new Apiresponse(200,req.user,"User is currently loggedIn")
    )

})

const changePassword = Asynchandler(async (req,res)=>{
    const {oldPassword,newPassword} = req.body;

    if(
        [oldPassword,newPassword].some((field)=>field?.trim() === "")
    ){
        throw new Apierror(402,"All fields are necessary")
    }

    //this may be frontend logic or we need it even here
    else if(oldPassword === newPassword){
        throw new Apierror(402,"old and new Passwords are same ");
    }

    const user = await User.findById(req.user?._id);

    const verifyPassword = await user.isPasswordCorrect(oldPassword);

    if(!verifyPassword){
        throw new Apierror(402,"Password does not match")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new Apiresponse(200,{},"Password changed successfully")
    )


})

const updateAccountDetails = Asynchandler(async (req,res) => {
    const {email,fullname,bio}  = req.body;

    if(
        [email,fullname,bio].some((fields) => fields?.trim() == "")
    ){
        throw new Apierror(400,"fields are empty")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                email,
                fullname,
                bio,
            },
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new Apiresponse(200,"updated user details successfully")
    )
})

const updateAvatar = Asynchandler(async (req,res) => {
    const avatarLocalPath = req.file?.path[0];

    if(!avatarLocalPath){
        throw new Apierror(404,"avatar path not found");
    }

    const avatar = await cloudinaryUploader(avatarLocalPath);

    if(!avatar.url){
        throw new Apierror(500,"Internal error while uploading avatar on cloud")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url,
            }    
        },
        {new:true}
    )
    return res
    .status(200)
    .json(
        new Apiresponse(200,user,"User avatar is updated successfully")
    )
})

const updateCoverImage = Asynchandler(async (req,res) => {
    const coverImageLocalPath = req.file?.path[0];

    if(!coverImageLocalPath){
        throw new Apierror(404,"avatar path not found");
    }

    const coverImage = await cloudinaryUploader(coverImageLocalPath);

    if(!coverImage.url){
        throw new Apierror(500,"Internal error while uploading coverImage on cloud")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url,
            }    
        },
        {new:true}
    )
    return res
    .status(200)
    .json(
        new Apiresponse(200,user,"User coverImage is updated successfully")
    )
})

export {
    registerUser,
    userLogin,
    userLogout,
    getCurrentUser,
    refreshToken,
    changePassword,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
}