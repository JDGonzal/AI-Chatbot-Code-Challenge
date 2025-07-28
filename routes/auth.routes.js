import express from "express";
import { registerUser, loginUser } from "../controllers/auth.controller.js";

const authRoutes = express.Router(); // Create a new router instance

// Define a route for user registration
authRoutes.post("/register", registerUser);
// Define a route for user login
authRoutes.post("/login", loginUser);

// Export the router to be used in the main app
export default authRoutes;
