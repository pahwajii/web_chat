import dotenv from 'dotenv';
dotenv.config();

/**
 * Generates a response from the Gemini API using native fetch.
 * Handles formatting history and persona.
 * 
 * @param {Array} history - Message history array from Mongoose
 * @returns {Promise<string>} The AI's response text
 */
export async function generateGeminiResponse(history) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    return "Hi there! I'm Gemini, your AI assistant. To enable me to talk to you, please configure the `GEMINI_API_KEY` environment variable in the backend `.env` file.";
  }

  try {
    // Format history for Gemini API
    const contents = [];
    for (const msg of history) {
      const role = msg.sender === 'Gemini' ? 'model' : 'user';
      
      // If consecutive messages are from the same role, merge them to satisfy strict alternation
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += '\n' + msg.message;
      } else {
        contents.push({
          role: role,
          parts: [{ text: msg.message }]
        });
      }
    }

    // Gemini API requires the first message to be from 'user'
    if (contents.length > 0 && contents[0].role === 'model') {
      contents.shift();
    }

    // If contents is empty, we have nothing to generate from
    if (contents.length === 0) {
      return "Hello! How can I help you today?";
    }

    const systemInstruction = {
      parts: [{
        text: "You are Gemini, a helpful, polite, and intelligent AI assistant in this web chat app. You can assist with general questions, coding, creative writing, or just chat. Feel free to format your responses using clear markdown formatting (bolding, headers, code blocks, lists) when appropriate, keeping the spacing clean."
      }]
    };

    const payload = {
      contents,
      systemInstruction
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error details:', errorData);
      throw new Error(`Gemini API returned status ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      throw new Error('Invalid response structure from Gemini API');
    }

    return replyText;
  } catch (error) {
    console.error('Failed to generate response from Gemini:', error);
    return `Sorry, I encountered an error while trying to process your request: ${error.message}`;
  }
}
