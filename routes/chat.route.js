import express from "express";
import { canAccess, financeChat } from "../controllers/chat.controller.js";
import { auth } from "../middleware/auth.js";

const chatRoutes = express.Router(); // Create a new router instance

chatRoutes.get("/can-access", [auth], canAccess); // Route to check user access
chatRoutes.post("/", [auth], financeChat); // Route to handle chat requests

// Export the router to be used in the main app
export default chatRoutes;
