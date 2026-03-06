import { Router } from "express";

const router = Router()
//firstRoute
router.route("/register").post(registerUser);
export{router}