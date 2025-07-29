import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a coherent response using OpenAI based on similar chunks and user question
 * @param {string} question - The user's question
 * @param {string[]} similarChunks - Array of similar text chunks from Pinecone
 * @returns {Promise<string>} - Generated response from OpenAI
 */
export async function generateResponseFromChunks(question, similarChunks) {
  try {
    // Combine all similar chunks into context
    const context = similarChunks.join('\n\n');
    
    const prompt = `
Eres un asistente experto en finanzas. Basándote en la siguiente información financiera relevante, responde de manera clara y precisa a la pregunta del usuario.

INFORMACIÓN FINANCIERA RELEVANTE:
${context}

PREGUNTA DEL USUARIO:
${question}

INSTRUCCIONES:
- Responde únicamente basándote en la información proporcionada
- Si la información no es suficiente para responder completamente, indícalo claramente
- Proporciona una respuesta estructurada y fácil de entender
- Incluye datos específicos cuando sea relevante
- Mantén un tono profesional pero accesible

RESPUESTA:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Eres un asistente experto en finanzas que proporciona información precisa y útil basada en datos financieros actuales."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating response with OpenAI:', error);
    throw new Error('Failed to generate response with OpenAI');
  }
}

/**
 * Validate and improve the quality of chunks using OpenAI
 * @param {string[]} chunks - Array of text chunks
 * @param {string} topic - The topic or context for validation
 * @returns {Promise<string[]>} - Validated and improved chunks
 */
export async function validateAndImproveChunks(chunks, topic) {
  try {
    const validatedChunks = [];
    
    for (const chunk of chunks) {
      const prompt = `
Analiza el siguiente fragmento de texto financiero y determina si es relevante y útil para responder preguntas sobre: ${topic}

FRAGMENTO:
${chunk}

INSTRUCCIONES:
- Si el fragmento es relevante, mejóralo eliminando información redundante o irrelevante
- Si el fragmento no es relevante, responde con "IRRELEVANT"
- Mantén la información financiera clave (números, fechas, nombres de empresas, etc.)
- Haz el texto más claro y conciso

RESULTADO:`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      const result = completion.choices[0].message.content.trim();
      
      if (result !== "IRRELEVANT" && result.length > 50) {
        validatedChunks.push(result);
      }
    }
    
    return validatedChunks;
  } catch (error) {
    console.error('Error validating chunks with OpenAI:', error);
    // Return original chunks if validation fails
    return chunks;
  }
}
