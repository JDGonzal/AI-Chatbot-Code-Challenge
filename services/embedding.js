import OpenAI from "openai";
import dotenv from "dotenv"; // Importing dotenv to manage environment variables

dotenv.config(); // Load environment variables from .env file
// console.log("OpenAI API Key:", process.env.OPENAI_API_KEY); // Debugging line to check if the API key is loaded correctly

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedChunks(chunks) {
  const embeddings = [];
  for (const chunk of chunks) {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small", // "text-embedding-ada-002",
      input: chunk,
      dimensions: 1024, // Reduce dimensions to match Pinecone index
    });
    embeddings.push(response.data[0].embedding);
  }
  return embeddings;
}
