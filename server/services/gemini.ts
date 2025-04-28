// Gemini API 설정
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_PRO_VISION_URL = `${GEMINI_API_BASE_URL}/gemini-pro-vision:generateContent`;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Gemini API를 직접 호출하여 결과를 반환하는 함수
 * 요청과 응답을 그대로 처리합니다.
 */
export async function generateContent(requestBody: any): Promise<any> {
  try {
    console.log('Starting direct Gemini API call with custom payload');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    // API 키를 URL에 추가
    const apiUrl = `${GEMINI_PRO_VISION_URL}?key=${GEMINI_API_KEY}`;
    
    // API 호출
    console.log('Calling Gemini API with custom payload');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }
    
    // JSON 데이터 반환
    const data = await response.json();
    return data;
    
  } catch (error: any) {
    console.error('Error calling Gemini API directly:', error);
    throw new Error(`Failed to call Gemini API: ${error.message}`);
  }
}

/**
 * Gemini 모델을 사용하여 이미지를 생성하는 함수
 */
export async function generateImageWithGemini(
  promptText: string
): Promise<string> {
  try {
    console.log('Starting image generation with Gemini API');
    console.log('Prompt:', promptText);
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    // Gemini API 요청 데이터 준비
    const requestData = {
      contents: [
        {
          parts: [
            {
              text: `Generate an image based on this description: ${promptText}. 
              The image should be high-quality and detailed.
              Create the best possible image representation of this prompt.`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    };
    
    // API 키를 URL에 추가
    const apiUrl = `${GEMINI_PRO_VISION_URL}?key=${GEMINI_API_KEY}`;
    
    // API 호출
    console.log('Calling Gemini API to generate image');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    // 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Gemini API response received:', JSON.stringify(data).substring(0, 200) + '...');
    
    // 이미지 URL 추출 (응답 구조에 따라 수정 필요할 수 있음)
    let imageUrl;
    
    try {
      // 응답에서 이미지 데이터 또는 URL 추출
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const content = data.candidates[0].content;
        
        // 이미지 파트 찾기
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            // 이미지 데이터가 있는 경우 (base64 인코딩)
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          } else if (part.fileData && part.fileData.fileUri) {
            // 이미지 URL이 있는 경우
            imageUrl = part.fileData.fileUri;
            break;
          } else if (part.text && part.text.includes('http')) {
            // 텍스트에 URL이 포함된 경우 (응급 처리)
            const match = part.text.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/i);
            if (match) {
              imageUrl = match[0];
              break;
            }
          }
        }
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
    }
    
    if (!imageUrl) {
      console.error('No image found in Gemini response:', data);
      throw new Error('Failed to extract image URL from Gemini response');
    }
    
    console.log('Successfully extracted image URL:', imageUrl.substring(0, 50) + '...');
    return imageUrl;
    
  } catch (error: any) {
    console.error('Error generating image with Gemini:', error);
    throw new Error(`Failed to generate image: ${error.message}`);
  }
}