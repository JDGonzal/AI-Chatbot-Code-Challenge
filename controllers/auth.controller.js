import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs"; // Import bcrypt for password hashing
import jwt from "jsonwebtoken"; // Import jsonwebtoken for token generation

// Function to register a new user
export const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body; // Extract username and password from request body
    const user = await User.find((user) => user.username == username); // Find user by username
    if (!user) {
      if (username.length > 10 || username.length < 3) {
        return res
          .status(400)
          .json({ error: "Username must be between 3-10 characters" }); // Handle username length
      }
      if (password.length > 20 || password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be between 6-20 characters" }); // Handle username length
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
    console.log("Sheed", process.env.AUTH_SEED); 
    const token = jwt.sign(
      { username: user.username }, // Username as payload
      process.env.AUTH_SEED, // Secret seed from environment variables
      {
        expiresIn: "1h", // Token expiration time
      }
    ); // Generate a JWT token
    res.status(200).json({ message: "Login successful",
      token, // Respond with the generated token
     }); // Respond with success message
  } catch (error) {
    res.status(500).json({ error: "Error logging in user" }); // Handle errors
    console.error(error); // Log the error for debugging
  }
};
