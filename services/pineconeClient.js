import { Pinecone } from "@pinecone-database/pinecone";
// console.log("Pinecone API Key:", process.env.PINECONE_API_KEY); // Debugging line to check if the API key is loaded correctly
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index("finance-index");

export async function upsertEmbeddings(embeddings, chunks) {
  const vectors = embeddings.map((embedding, i) => ({
    id: `chunk-${i}`,
    values: embedding,
    metadata: { text: chunks[i] },
  }));
  await index.upsert(vectors);
}

export async function searchSimilarChunks(queryEmbedding, topK = 3) {
  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });
  return results.matches.map((match) => match.metadata.text);
}
