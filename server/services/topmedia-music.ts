/**
 * TopMediai AI Music Generator API Integration
 * 
 * This service connects to TopMediai's AI music generation API to create
 * personalized music based on user inputs.
 */

// API Constants
const API_URL = 'https://api.aimusicgenerator.com/v1/generate';
const API_KEY = process.env.TOPMEDIA_API_KEY || '0696de496a39450790a5582fe823c730';

/**
 * Generate music using TopMediai's AI service
 * 
 * @param lyrics - Short phrase or words to incorporate (e.g., baby name)
 * @param style - Music style (e.g., lullaby, love song)
 * @param duration - Duration in seconds (60, 120, or 180)
 * @returns Object containing the generated music URL and metadata
 */
export async function generateAiMusic(
  lyrics: string,
  style: string,
  duration: string
): Promise<{ url: string; metadata: any }> {
  try {
    console.log(`Generating music with lyrics: "${lyrics}", style: ${style}, duration: ${duration}s`);
    
    // Prepare request payload
    const payload = {
      lyrics,
      style, 
      duration
    };
    
    // Make API request to TopMediai
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'api_key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Handle API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('TopMediai API error:', errorData || response.statusText);
      throw new Error(`Music generation failed with status: ${response.status}`);
    }
    
    // Parse successful response
    const data = await response.json();
    
    console.log('Music generated successfully:', data);
    
    // Return the results with the music URL and additional metadata
    return {
      url: data.url || data.music_url || '',
      metadata: {
        style,
        duration,
        lyrics,
        generatedAt: new Date().toISOString(),
        provider: 'topmedia'
      }
    };
  } catch (error) {
    console.error('Error generating music with TopMediai API:', error);
    throw new Error('Failed to generate music. Please try again later.');
  }
}

/**
 * Get available music styles
 * 
 * @returns Array of available music styles
 */
export function getAvailableMusicStyles(): { id: string; name: string; description?: string }[] {
  return [
    { id: 'lullaby', name: '자장가', description: '부드럽고 달콤한 자장가' },
    { id: 'traditional_korean', name: '한국 전통음악', description: '한국 전통 선율이 담긴 음악' },
    { id: 'classical', name: '클래식', description: '클래식 스타일의 태교 음악' },
    { id: 'nature', name: '자연의 소리', description: '자연 소리와 함께하는 평화로운 멜로디' },
    { id: 'piano', name: '피아노', description: '부드러운 피아노 멜로디' }
  ];
}

/**
 * Get available song durations
 * 
 * @returns Array of available durations
 */
export function getAvailableDurations(): { value: string; label: string }[] {
  return [
    { value: '60', label: '1분' },
    { value: '120', label: '2분' },
    { value: '180', label: '3분' }
  ];
}