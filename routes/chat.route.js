import express from "express";
import { canAccess } from "../controllers/chat.controller.js";
import { auth } from "../middleware/auth.js";

const chatRoutes = express.Router(); // Create a new router instance

// Just check if the user can access the chat
chatRoutes.get("/can-access", [auth], canAccess);

// Export the router to be used in the main app
export default chatRoutes;
