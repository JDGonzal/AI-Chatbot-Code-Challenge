import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";

// Function to register a new user
export const canAccess = async (req, res) => {
  try {
    const { username, token } = req.body; // Extract username and password from request body
    const user = await User.find((user) => user.username == username); // Find user by username
    if (user) {
      console.log("Testing with middleware:"); // Log the new user for debugging
      res
        .status(200)
        .json({ message: "The user can access the chat", chat: Chat }); // Respond with success message
    } else {
      res.status(400).json({ error: "Username doesn't exists" }); // Handle duplicate username
    }
  } catch (error) {
    res.status(500).json({ error: "Error testing Access" }); // Handle errors
    console.error(error); // Log the error for debugging
  }
};
