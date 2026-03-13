import { Asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Asynchandler.js";
import { cloudinaryUploader } from "../utils/Cloudinary.js";
import { post, post } from "../models/post.models.js";
import { User } from "../models/user.models.js";

const createPost = Asynchandler(async (req, res) => {
  const { title, content, tags, isPublished } = req.body;

  if (!title || !content) {
    throw new Apierror(401, "title and content are mandat6ory");
  }

  const localPath = req.files?.mediaImage?.[0]?.path;

  if (!localPath) {
    throw new Apierror(401, "thumbnail local path not found");
  }

  const thumbnail = await cloudinaryUploader(localPath);

  //this takes title and content and conver tit into numerical values(embedding)
  //when user search a query it converts those query to numeric value and match
  //it with stored embedding it understands meanning rather than keyword
  const embedding = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: `${title} ${content}`,
  });

  const createdPost = await post.create({
    title,
    content,
    mediaImage: thumbnail.url,
    owner: req.user._id,
    tags: tags || [],
    isPublished: req.user.status || false,
    contentVector: embedding,
  });

  return res
    .status(201)
    .json(new Apiresponse(201, createdPost, "Post created successfully"));
});

//home feed
const getAllPost = Asynchandler(async (req, res) => {
  const guest = !req.user;

  if (guest) {
    const Post = await post
      .find({ isPublished: true })
      .populate("owner", "username ", "avatar")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(new Apiresponse(200, latestPost, "posts fetched successfully"));
  }

  const smartFeed = await post.aggregate(
    [
      {
        $vectorSearch:{
          index:"vector_index",
          path:"contentVector",
          queryVector:req.user.userIntrestVector,
          numCandidates:100,
          limit:10,
        }
      },

      {
        $match:{
          isPublished:true,
        }
      },

      {
        $lookup:{
          from:User,
          localField:"owner",
          foreignField:"_id",
          as:"owner",

          pipeline:[{
            $project:{
              username:1,
              avatar:1,
            }
          }]
        }
      },

      {
        $unwind:"owner"
      }
    ]
  )

  return res 
  .status(200)
  .json(200,smartFeed,"feed based on user fetched successfully")


});

//it converts title in to slug then find post and return it 
const getPostById = Asynchandler(async (req,res) => {
  const {slug} = req.params;

  const Post = await post.findOne({slug,isPublished:true})
  .populate("owner","username avatar","views")

  if(!Post){
    throw new Apierror(404,"post does nit found")
  }
  
  return res
  .status(200)
  .json(200,Post,"PostById fetched successfully")

  
})

const deletePost = Asynchandler(async (req,res) => {
  const {postId} = req.params;

  const foundPost = await post.findById(postId)

  if(!foundPost){
    throw new Apierror(404,"posts not found")
  }

  const user = req.user._id;

  if(user.toString() !== foundPost.owner.toString()){
    throw new Apierror(403,"unauthorize to delete post")
  }

  const imageUrl = foundPost.mediaImage

  if(imageUrl){
    const publicId = imageUrl
    .split("/")
    .pop()
    .split(".")[0]

    await cloudinaryUploader.destroy(publicId)
  }

  await post.findByIdAndDelete(postId);

  return res
  .status(200)
  .json(
    new Apiresponse(200,{},"Post deleted successfully")
  )





})
export { 
  createPost,
  getAllPost,
  getPostById,
  
 };
