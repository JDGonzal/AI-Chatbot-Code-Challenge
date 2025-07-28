import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";

import { fetchAndExtractText } from "../services/scraper.js";
import { chunkText } from "../services/chunker.js";
import { embedChunks } from "../services/embedding.js";
import {
  upsertEmbeddings,
  searchSimilarChunks,
} from "../services/pineconeClient.js";

// Function to register a new user
export const canAccess = async (req, res) => {
  try {
    const { username } = req.body; // Extract username and password from request body
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

// Constants for finance URLs
const FINANCE_URLS = [
  // "https://www-google-com.translate.goog/finance/?_x_tr_sl=en&_x_tr_tl=es&_x_tr_hl=es&_x_tr_pto=sge",
  // "https://www.tradingview.com/markets/stocks-usa/#news",
  "https://www.investing.com/markets/united-states",
];

// Function to interact with OpenAI and `Pinecone` Vector
export const financeChat = async (req, res) => {
  try {
    const { username, question } = req.body; // Extract username and password from request body
    const user = await User.find((user) => user.username == username); // Find user by username
    if (user) {
      // 1. Scraping and text extraction
      let allText = "";
      for (const url of FINANCE_URLS) {
        const text = await fetchAndExtractText(url);
        allText += text + "\n";
      }
      console.log("Scraped text: \n", allText.length); // Log the scraped text for debugging
      // 2. Chunking
      const chunks = chunkText(allText, 1024);
      console.log("Chunks created: \n", chunks.length); // Log the number of chunks created for debugging
      // 3. Embeddings of the chunks
      const embeddings = await embedChunks(chunks);
      console.log("Embeddings created: \n", embeddings.length); // Log the number of embeddings created for debugging
      // 4. Vectorizing in Pinecone
      await upsertEmbeddings(embeddings, chunks);
      console.log("Embeddings upserted to Pinecone:", question); // Log the successful upsert for debugging
      // 5. Embedding of the question and search
      console.log("Creating question embedding..."); // Log the start of question embedding creation
      const [questionEmbedding] = await embedChunks([question]);
      console.log("Question embedding created"); // Log the question embedding for debugging
      // 6. Search similar chunks in Pinecone 
      const results = await searchSimilarChunks(questionEmbedding, 3);
      console.log("Search results: \n", results); // Log the search results for debugging
      // 7. Respond with the results
      res.status(200).json({ chat: results }); // Respond with success message
    } else {
      res.status(400).json({ error: "Username doesn't exists" }); // Handle duplicate username
    }
  } catch (error) {
    res.status(500).json({ error: "Error testing Access" }); // Handle errors
    console.error(error); // Log the error for debugging
  }
};
