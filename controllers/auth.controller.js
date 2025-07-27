import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs"; // Import bcrypt for password hashing

// Function to register a new user
export const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body; // Extract username and password from request body
    const user = await User.find((user) => user.username == username); // Find user by username
    if (!user) {
      if (username.length > 10) {
        return res
          .status(400)
          .json({ error: "Username must be less than 10 characters" }); // Handle username length
      }
      if (password.length > 20) {
        return res
          .status(400)
          .json({ error: "Password must be less than 20 characters" }); // Handle username length
      }
      const hashedPassword = await bcrypt.hash(password, 10); // Hash the password with bcrypt
      const newUser = {
        username,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      }; // Create a new user instance
      console.log("New user created:", newUser); // Log the new user for debugging
      // Save the new user to the User array (or database)
      User.push(newUser); // Add the new user to the User array
      console.log("User registered:"); // Log the new user for debugging
      console.table(User); // Display the User array in a table format
      res.status(201).json({ message: "User registered successfully" }); // Respond with success message
    } else {
      res.status(400).json({ error: "Username already exists" }); // Handle duplicate username
    }
  } catch (error) {
    res.status(500).json({ error: "Error registering user" }); // Handle errors
    console.error(error); // Log the error for debugging
  }
};
// Function to log in a user
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body; // Extract username and password from request body
    const user = await User.find((user) => user.username == username); // Find user by username
    if (!user) {
      return res.status(404).json({ error: "User not found" }); // Handle user not found
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const isPasswordValid = await bcrypt.compare(password, user.password); // Compare provided password with hashed password
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" }); // Handle invalid password
    }
    res.status(200).json({ message: "Login successful" }); // Respond with success message
  } catch (error) {
    res.status(500).json({ error: "Error logging in user" }); // Handle errors
    console.error(error); // Log the error for debugging
  }
};
