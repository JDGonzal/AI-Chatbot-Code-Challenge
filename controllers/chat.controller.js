import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";

import { fetchAndExtractText } from "../services/scraper.js";
import { chunkText } from "../services/chunker.js";
import { embedChunks } from "../services/embedding.js";
import {
  upsertEmbeddings,
  searchSimilarChunks,
} from "../services/pineconeClient.js";
import { 
  generateResponseFromChunks, 
  validateAndImproveChunks 
} from "../services/openai.js";

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
      const similarChunks = await searchSimilarChunks(questionEmbedding, 5);
      console.log("Search results: \n", similarChunks); // Log the search results for debugging
      
      // 7. Validate and improve chunks with OpenAI
      console.log("Validating and improving chunks with OpenAI...");
      let validatedChunks;
      try {
        validatedChunks = await validateAndImproveChunks(similarChunks, "finanzas y mercados");
        console.log("Validated chunks: \n", validatedChunks.length);
      } catch (openaiError) {
        console.warn("OpenAI validation failed, using original chunks:", openaiError.message);
        validatedChunks = similarChunks; // Fallback to original chunks
      }
      
      // 8. Generate coherent response using OpenAI
      console.log("Generating response with OpenAI...");
      let aiResponse;
      try {
        aiResponse = await generateResponseFromChunks(question, validatedChunks);
        console.log("AI Response generated");
      } catch (openaiError) {
        console.warn("OpenAI response generation failed, using fallback:", openaiError.message);
        // Fallback response with the chunks
        aiResponse = `Basándome en la información financiera disponible, he encontrado ${validatedChunks.length} fragmentos relevantes para tu pregunta: "${question}". 

Los datos más relevantes incluyen:
${validatedChunks.slice(0, 3).map((chunk, index) => `${index + 1}. ${chunk.substring(0, 200)}...`).join('\n\n')}

Nota: La respuesta generada automáticamente no está disponible en este momento, pero puedes revisar los fragmentos de información proporcionados.`;
      }
      
      // 9. Respond with the AI-generated answer and source chunks
      res.status(200).json({ 
        chat: aiResponse,
        sources: validatedChunks,
        originalChunks: similarChunks.length,
        validatedChunks: validatedChunks.length,
        aiProcessed: true
      }); // Respond with success message
    } else {
      res.status(400).json({ error: "Username doesn't exists" }); // Handle duplicate username
    }
  } catch (error) {
    res.status(500).json({ error: "Error testing Access" }); // Handle errors
    console.error(error); // Log the error for debugging
  }
};
