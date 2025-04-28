import fetch from 'node-fetch';

async function testGeminiImageGeneration() {
  try {
    console.log('Testing Gemini image generation API...');
    
    const response = await fetch('http://localhost:5000/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A cute SD character baby sitting next to a fluffy puppy in watercolor style',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Success! Received response:');
      console.log('Image URL:', data.imageUrl?.substring(0, 50) + '...');
      console.log('Prompt:', data.prompt);
    } else {
      console.error('API request failed with status:', response.status);
      console.error('Error response:', data);
    }
  } catch (error) {
    console.error('Error testing Gemini API:', error);
  }
}

testGeminiImageGeneration();