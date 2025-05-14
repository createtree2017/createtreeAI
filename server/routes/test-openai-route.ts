import { Router } from 'express';
import { z } from 'zod';
import { generateLyrics, translateText } from '../services/lyrics-service';

const testOpenAIRouter = Router();

// OpenAI API 테스트 엔드포인트 - 가사 생성 테스트
testOpenAIRouter.post('/test-lyrics', async (req, res) => {
  try {
    // 요청 데이터 검증 스키마
    const testSchema = z.object({
      prompt: z.string().min(3, "프롬프트는 최소 3자 이상이어야 합니다."),
      genre: z.string().optional(),
      mood: z.string().optional(),
      language: z.string().optional().default("korean")
    });
    
    // 요청 데이터 검증
    const result = testSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: '입력 형식이 잘못되었습니다.', 
        details: result.error.format() 
      });
    }
    
    console.log("OpenAI 테스트 API 호출 - 가사 생성 시도:", result.data);
    
    // 가사 생성 API 호출
    const lyrics = await generateLyrics(result.data);
    
    // 성공 응답
    res.status(200).json({ 
      success: true,
      data: {
        prompt: result.data.prompt,
        genre: result.data.genre,
        mood: result.data.mood,
        language: result.data.language,
        lyrics: lyrics
      },
      message: 'OpenAI API 호출 성공!'
    });
  } catch (error) {
    console.error('OpenAI 테스트 엔드포인트 오류:', error);
    res.status(500).json({ 
      success: false,
      error: 'OpenAI API 호출 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// OpenAI API 테스트 엔드포인트 - 번역 테스트
testOpenAIRouter.post('/test-translate', async (req, res) => {
  try {
    // 요청 데이터 검증 스키마
    const testSchema = z.object({
      text: z.string().min(1, "번역할 텍스트는 최소 1자 이상이어야 합니다."),
      targetLanguage: z.enum(["korean", "english"]).default("english")
    });
    
    // 요청 데이터 검증
    const result = testSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: '입력 형식이 잘못되었습니다.', 
        details: result.error.format() 
      });
    }
    
    console.log("OpenAI 테스트 API 호출 - 번역 시도:", result.data);
    
    // 번역 API 호출
    const translatedText = await translateText(result.data.text, result.data.targetLanguage);
    
    // 성공 응답
    res.status(200).json({ 
      success: true,
      data: {
        originalText: result.data.text,
        targetLanguage: result.data.targetLanguage,
        translatedText: translatedText
      },
      message: 'OpenAI API 번역 호출 성공!'
    });
  } catch (error) {
    console.error('OpenAI 번역 테스트 엔드포인트 오류:', error);
    res.status(500).json({ 
      success: false,
      error: 'OpenAI 번역 API 호출 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default testOpenAIRouter;