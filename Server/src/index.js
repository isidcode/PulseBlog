import dotenv from "dotenv";
dotenv.config()
import {connectDb} from "./db/Index.js";
import {app} from "./app.js"
connectDb()
.then(()=>{
    app.listen(process.env.PORT || 8300,()=>{
        console.log(`database is successfully running at port: ${process.env.PORT }`)
    })
})
.catch((error)=>{
    console.log("Database does not connected successfully")

})
    
