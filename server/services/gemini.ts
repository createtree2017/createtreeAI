import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import os from 'os';

// 서비스 계정 인증 및 토큰 관리
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// Gemini API 설정
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_PRO_VISION_URL = `${GEMINI_API_BASE_URL}/gemini-pro-vision:generateContent`;
const AUTH_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

/**
 * 환경변수에서 서비스 계정 키를 가져와 임시 파일로 저장
 * GoogleAuth가 파일 기반 인증을 사용하기 때문에 필요함
 */
async function prepareServiceAccountKey(): Promise<string> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set');
  }
  
  try {
    // 임시 디렉토리에 서비스 계정 키 파일 생성
    const tempDir = os.tmpdir();
    const keyFilePath = path.join(tempDir, 'gemini-service-account-key.json');
    
    // 환경변수 내용을 파일로 저장
    fs.writeFileSync(keyFilePath, credentialsJson, { encoding: 'utf8' });
    console.log(`Service account key written to temporary file: ${keyFilePath}`);
    
    return keyFilePath;
  } catch (error: any) {
    console.error('Error preparing service account key file:', error);
    throw new Error('Failed to prepare service account key file');
  }
}

/**
 * 서비스 계정으로부터 Access Token을 가져오는 함수
 * 토큰이 만료되었거나 없는 경우에만 새로 발급
 */
async function getAccessToken(): Promise<string> {
  const currentTime = Date.now();
  
  // 유효한 토큰이 있으면 재사용 (만료 10분 전에 갱신)
  if (accessToken && tokenExpiry > currentTime + 10 * 60 * 1000) {
    console.log('Using cached access token');
    return accessToken;
  }

  try {
    console.log('Generating new access token for Gemini API');
    
    // 서비스 계정 키 파일 준비
    const keyFilePath = await prepareServiceAccountKey();
    
    // 서비스 계정 인증 객체 생성
    const auth = new GoogleAuth({
      scopes: [AUTH_SCOPE],
      keyFile: keyFilePath
    });

    // 인증 클라이언트 획득
    const client = await auth.getClient();
    // 토큰 획득
    const tokenResponse = await client.getAccessToken();
    
    if (!tokenResponse.token) {
      throw new Error('Failed to get access token');
    }
    
    accessToken = tokenResponse.token;
    // 토큰 만료 시간 계산 (기본 1시간)
    tokenExpiry = currentTime + 60 * 60 * 1000;
    
    console.log('New access token generated, valid until:', new Date(tokenExpiry).toISOString());
    
    // 임시 파일 삭제
    try {
      fs.unlinkSync(keyFilePath);
      console.log('Temporary service account key file deleted');
    } catch (unlinkError) {
      console.warn('Warning: Failed to delete temporary key file:', unlinkError);
    }
    
    return accessToken;
  } catch (error: any) {
    console.error('Error getting access token:', error);
    throw new Error(`Failed to get Google Cloud access token: ${error.message}`);
  }
}

/**
 * Gemini API를 직접 호출하여 결과를 반환하는 함수
 * 요청과 응답을 그대로 처리합니다.
 */
export async function generateContent(requestBody: any): Promise<any> {
  try {
    console.log('Starting direct Gemini API call with custom payload');
    
    // 1. 액세스 토큰 획득
    const token = await getAccessToken();
    
    // 2. API 호출
    console.log('Calling Gemini API with custom payload');
    const response = await fetch(GEMINI_PRO_VISION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });
    
    // 3. 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }
    
    // 4. JSON 데이터 반환
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
    
    // 1. 액세스 토큰 획득
    const token = await getAccessToken();
    
    // 2. Gemini API 요청 데이터 준비
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
    
    // 3. API 호출
    console.log('Calling Gemini API to generate image');
    const response = await fetch(GEMINI_PRO_VISION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });
    
    // 4. 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Gemini API response received:', JSON.stringify(data).substring(0, 200) + '...');
    
    // 5. 이미지 URL 추출 (응답 구조에 따라 수정 필요할 수 있음)
    let imageUrl;
    
    try {
      // 응답에서 이미지 데이터 또는 URL 추출 (실제 응답 구조에 따라 조정 필요)
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const content = data.candidates[0].content;
        
        // 이미지 파트 찾기 (응답 형식에 따라 달라질 수 있음)
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            // 이미지 데이터가 있는 경우 (base64 인코딩되어 있을 수 있음)
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