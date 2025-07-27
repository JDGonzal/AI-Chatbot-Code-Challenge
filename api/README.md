# AI-Chatbot-Code-Challenge

>[!NOTE]
>**Technical details**

## 0. Steps to start

1. Install NPM and NODEJS in your system [Nodejs Download](https://nodejs.org/en/download/current/) or install multiple versions [Instalar múltiples versiones de Node.js en Windows](https://rafaelneto.dev/blog/instalar-multiples-versiones-nodejs-windows/)
2. Check in $path or %path% the nodeJS and npm are on it
  ```bash
  C:/Program Files/nodejs
  ```
3. Run in a `TERMINAL` those commands: </br> `node -v` -> Must be `22.16.0` or up </br> `npm -v` -> Must be `10.9.2` or up.
4. Install Postman
  [Postman Download](https://www.postman.com/downloads/)
5. Install MySQL 5.6.x
  [MySQL Download 5.6.26](https://downloads.mysql.com/archives/community/)
6. Install Visual Studio Code
  [Visual Studio Download](https://code.visualstudio.com/insiders/)
7. Al least access to [`Supabase`](https://supabase.com/), for a `user` table or access permissions.

## 1. Setting the environment

1. Using a `TERMINAL` run this command: </br> `npm init -y`
2. Open the new file **`package.json`**, and do some changes: </br> Instead of `"main": "server.js"` </br> Put `"type": "module",`.
3. Run in a `TERMINAL` this command: </br> `npm install express cors dotenv bcryptjs -E` </br> o </br> `pnpm add express cors dotenv bcryptjs -E`
4. Run in a `TERMINAL` this command, or: </br> `npm install nodemon -E -D` </br> or </br> `pnpm add nodemon -E -D`
5. Create a file in root with name **`server.js`**.
6. In the `"scripts"`, add two new options: </br> `"dev": "nodemon server.js",` </br> `"start": "node server.js"`
7. Create a file in the root with name **`.env`**, at least with the `PORT` definition: </br> `PORT = 3000`
8. Adding some code to **`server.js`** file:
```js
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
  res.send("Welcome to the AI Chatbot Code Challenge API!");
});
// listen on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
export default app; // Export the app instance for testing or further configuration
// This is the main entry point for the AI Chatbot Code Challenge API server.
```
9. Using a `TERMINAL` run this command, or: </br> `npm run dev` </br> or </br> `pnpm dev`
10. For a simple test go to any browser and write this _URL_: `http://localhost:3000/`



