import express from "express"; // Importing express to create the server
import cors from "cors"; // Importing cors to handle Cross-Origin Resource Sharing
import dotenv from "dotenv"; // Importing dotenv to manage environment variables

dotenv.config(); // Load environment variables from .env file
const app = express(); // Create an instance of express
const PORT = process.env.PORT || 3000; // Set the port from environment variables or default to 3000
app.use(cors()); // Use cors middleware to allow cross-origin requests
app.use(express.json()); // Use express.json() middleware to parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Use express.urlencoded() middleware to parse URL-encoded request bodies
// Define a simple route for the root URL
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the AI Chatbot Code Challenge API!" });
});
// Routes
import  authRoutes  from "./routes/auth.routes.js"; // Importing authentication routes
app.use("/api/auth", authRoutes); // Use the authentication routes under the /api/auth

// listen on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
export default app; // Export the app instance for testing or further configuration
// This is the main entry point for the AI Chatbot Code Challenge API server.
