// Simple OpenAI API wrapper
const { OpenAI } = require('openai');

// Create an instance with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = openai;