// Simple OpenAI API wrapper
import OpenAI from 'openai';

// Create an instance with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
export default openai;