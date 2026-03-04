import dotenv from "dotenv";
dotenv.config()
import express from 'express';

const app = express()

//to clean cookie string in to a clean object
app.use(cookieParser())

//for valid request access
app.use(cors())

//configure server to accept data up to 16kb
app.use(express.json({limit:"16kb"}))

//configure server to clean garbage value from url convert in to req.body
app.use(express(urlencoded({extended:"true",limit:"16kb"})))

//configure server to check public folder before complex db query
app.use(express.static("public"))

//day1 till here



export {app}
