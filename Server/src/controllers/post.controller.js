import { Asynchandler } from "../utils/Asynchandler.js";
import { Apierror } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Asynchandler.js";
import { cloudinaryUploader } from "../utils/Cloudinary.js";
import { post, post, post } from "../models/post.models.js";
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

  const smartFeed = await post.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "contentVector",
        queryVector: req.user.userIntrestVector,
        numCandidates: 100,
        limit: 10,
      },
    },

    {
      $match: {
        isPublished: true,
      },
    },

    {
      $lookup: {
        from: User,
        localField: "owner",
        foreignField: "_id",
        as: "owner",

        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },

    {
      $unwind: "owner",
    },
  ]);

  return res
    .status(200)
    .json(200, smartFeed, "feed based on user fetched successfully");
});

//it converts title in to slug then find post and return it
const getPostById = Asynchandler(async (req, res) => {
  const { slug } = req.params;

  const Post = await post
    .findOne({ slug, isPublished: true })
    .populate("owner", "username avatar", "views");

  if (!Post) {
    throw new Apierror(404, "post does nit found");
  }

  return res.status(200).json(200, Post, "PostById fetched successfully");
});

const deletePost = Asynchandler(async (req, res) => {
  const { postId } = req.params;

  const foundPost = await post.findById(postId);

  if (!foundPost) {
    throw new Apierror(404, "posts not found");
  }

  const user = req.user._id;

  if (user.toString() !== foundPost.owner.toString()) {
    throw new Apierror(403, "unauthorize to delete post");
  }

  const imageUrl = foundPost.mediaImage;

  if (imageUrl) {
    const publicId = imageUrl.split("/").pop().split(".")[0];

    await cloudinaryUploader.destroy(publicId);
  }

  await post.findByIdAndDelete(postId);

  return res
    .status(200)
    .json(new Apiresponse(200, {}, "Post deleted successfully"));
});

//slug and post id may create a mesh be careful while testing
const updatePost = Asynchandler(async (req, res) => {
  const { postId } = req.params;

  const findPost = await post.findById(postId);

  if (!findPost) {
    throw new Apierror(404, "Post not found");
  }

  if (findPost.owner.toString() !== req.user._id.toString()) {
    throw new Apierror(403, "unauthorize to perform update request");
  }

  //here we cannot put findpost.content because it overwrites the exiting content instead of just updating

  if (req.body.text) {
    findPost.text = req.body.text;
  }

  if (req.file) {
    const existingImage = findPost.mediaImage;

    const newImage = await cloudinaryUploader(req.file?.path);

    if (!newImage) {
      throw new Apierror(500, "somethong went wrong while uploading new image");
    }

    if (existingImage) {
      const imageId = existingImage.split("/").pop().split(".")[0];

      await cloudinaryUploader.destroy(imageId);
    }

    findPost.mediaImage = newImage.url;
  }

  const update = await findPost.save();

  return res.status(200).json({
    status: 200,
    data: update,
    message: "Post updated successfully",
  });
});

const getPostByAuthor = Asynchandler(async (req, res) => {
  const { userId } = req.params;

  const allPosts = await post
    .find({ owner: userId, isPublished: false })
    .sort({
      createdAt: -1,
    })
    .populate("owner", "username avatar");

  if (allPosts.length == 0) {
    return res.status(200).json({
      status: 200,
      data: [],
      message: "no posts till yet",
    });
  }

  return res.status(200).json({
    status: 200,
    data: allPosts,
    message: "All posts fetched successfully",
  });
});

//in route postId should be their either wise it says undefined
const togglePostStatus = Asynchandler(async (req, res) => {
  //verify jwt
  const { postId } = req.params;

  const Post = await post.findById(postId);

  if (!Post) {
    throw new Apierror(404, "post not found");
  }

  if (Post.owner.toString() !== req.user._id.toString()) {
    throw new Apierror(403, "unauthorize to perform this request");
  }

  Post.isPublished = !Post.isPublished;
  const flippedStatus = await Post.save();

  return res.status(200).json(
    new Apiresponse({
      status: 200,
      data: flippedStatus,
      message: "status saved successfully",
    }),
  );
});

const searchPostsDiscovery = Asynchandler(async (req,res) => {
  const {query} = req.query;

  const vector = await generateEmbedding(query);

  const posts = await post.aggregate(
    [
      {
        $vectorSearch:{
          index:"vector_index",
          path:"contentVector",
          queryVector:"vector",
          numCandidates:100,
          limit:10,
          filter:{isPublished:{$eq:true}}
        }
      },
      
      {
        $lookup:{
          from:"User",
          localField:"owner",
          foreignField:"_id",
          as:"owner"
        }
      },
      {
        $unwind:"owner"
      },
      {
        $addFields:{
          viewsCount:{ 
            $size: { 
              $ifNull: ["$views", []] 
            } 
          },
        }
      },
      {
        $project:{
          "owner.password":0,
          "owner.refreshToken":0,
          contentVector:0,
        }
       
      }
    ]
  )

  return res
  .status(200)
  .json(
    new Apiresponse(
        {
          status:200,
          data:posts,
          message:"top Post recommended successfully"
        }
    )
    
  )


})

export {
  createPost,
  getAllPost,
  getPostById,
  deletePost,
  updatePost,
  getPostByAuthor,
  togglePostStatus,
};
