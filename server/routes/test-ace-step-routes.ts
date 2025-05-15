/**
 * ACE-Step 모델 테스트용 API 라우트
 */
import { Router } from "express";
import { AceStepInput, createAceStepInput, generateMusicWithAceStep } from "../services/music-service";
import { generateLyrics } from "../services/lyrics-service";
import { translateText } from "../services/gemini-lyrics-service";

const router = Router();

// ACE-Step 모델 테스트를 위한 음악 생성 엔드포인트
router.post("/generate", async (req, res) => {
  try {
    const { prompt, lyrics, duration, style, guidance_scale, tag_guidance_scale, lyric_guidance_scale } = req.body;
    
    if (!prompt || !lyrics) {
      return res.status(400).json({ 
        error: "프롬프트와 가사는 필수 입력 항목입니다." 
      });
    }
    
    console.log("ACE-Step 음악 생성 요청:", { prompt, duration });
    
    // 지원되는 음악 길이 (60, 120, 180, 240초)
    let validatedDuration = 120; // 기본값 2분
    if (duration) {
      const durationNumber = parseInt(duration, 10);
      if ([60, 120, 180, 240].includes(durationNumber)) {
        validatedDuration = durationNumber;
      } else {
        console.warn(`지원되지 않는 음악 길이: ${duration}, 기본값 120초로 설정됩니다.`);
      }
    }
    
    // ACE-Step 입력 파라미터 생성
    const input: AceStepInput = createAceStepInput(
      prompt,
      lyrics,
      validatedDuration,
      {
        guidance_scale: guidance_scale ? parseFloat(guidance_scale) : 7,
        tag_guidance_scale: tag_guidance_scale ? parseFloat(tag_guidance_scale) : 8,
        lyric_guidance_scale: lyric_guidance_scale ? parseFloat(lyric_guidance_scale) : 10
      }
    );
    
    // 음악 생성
    const audioUrl = await generateMusicWithAceStep(input);
    
    if (!audioUrl) {
      return res.status(500).json({ 
        error: "음악 생성에 실패했습니다." 
      });
    }
    
    res.status(200).json({
      success: true,
      audioUrl,
      input
    });
  } catch (error) {
    console.error("ACE-Step 음악 생성 API 오류:", error);
    if (error instanceof Error && error.stack) {
      console.error("오류 스택:", error.stack);
    }
    
    // 오류 응답 상세화
    let errorMessage = "알 수 없는 오류가 발생했습니다.";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Replicate API 오류 관련 상세 메시지 추가
      if (errorMessage.includes("Invalid version")) {
        errorMessage = `모델 버전 오류: ${errorMessage}`;
      } else if (errorMessage.includes("API key")) {
        errorMessage = `인증 오류: ${errorMessage}`;
      }
    }
    
    res.status(500).json({ 
      error: errorMessage 
    });
  }
});

// 가사 생성 및 음악 생성 통합 엔드포인트
router.post("/generate-with-lyrics", async (req, res) => {
  try {
    const { prompt, duration, style } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: "프롬프트는 필수 입력 항목입니다." 
      });
    }
    
    console.log("가사+음악 통합 생성 요청:", { prompt, duration, style });
    
    // 지원되는 음악 길이 (60, 120, 180, 240초)
    let validatedDuration = 120; // 기본값 2분
    if (duration) {
      const durationNumber = parseInt(duration, 10);
      if ([60, 120, 180, 240].includes(durationNumber)) {
        validatedDuration = durationNumber;
      } else {
        console.warn(`지원되지 않는 음악 길이: ${duration}, 기본값 120초로 설정됩니다.`);
      }
    }
    
    // 1. 가사 생성
    console.log("1단계: 가사 생성 시작");
    const lyricsResult = await generateLyrics(prompt, style || "lullaby");
    
    if (!lyricsResult || !lyricsResult.lyrics) {
      return res.status(500).json({ 
        error: "가사 생성에 실패했습니다." 
      });
    }
    
    const lyrics = lyricsResult.lyrics;
    console.log("생성된 가사:", lyrics);
    
    // 2. 프롬프트 강화
    let enhancedPrompt = prompt;
    if (style) {
      enhancedPrompt += `, style: ${style}`;
    }
    enhancedPrompt += ", high quality, vocals, clear, professional";
    
    // 3. ACE-Step 입력 파라미터 생성
    const input: AceStepInput = createAceStepInput(
      enhancedPrompt,
      lyrics,
      validatedDuration
    );
    
    // 4. 음악 생성
    console.log("2단계: ACE-Step 음악 생성 시작");
    const audioUrl = await generateMusicWithAceStep(input);
    
    if (!audioUrl) {
      return res.status(500).json({ 
        error: "음악 생성에 실패했습니다." 
      });
    }
    
    res.status(200).json({
      success: true,
      audioUrl,
      lyrics,
      duration: validatedDuration,
      prompt: enhancedPrompt
    });
  } catch (error) {
    console.error("통합 생성 API 오류:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다." 
    });
  }
});

// 한국어 가사 테스트용 엔드포인트
router.post("/test-korean", async (req, res) => {
  try {
    const { koreanPrompt, koreanLyrics, duration } = req.body;
    
    if (!koreanPrompt || !koreanLyrics) {
      return res.status(400).json({ 
        error: "한국어 프롬프트와 가사는 필수 입력 항목입니다." 
      });
    }
    
    console.log("한국어 가사 테스트 요청:", { koreanPrompt, duration });
    
    // 지원되는 음악 길이 (60, 120, 180, 240초)
    let validatedDuration = 120; // 기본값 2분
    if (duration) {
      const durationNumber = parseInt(duration, 10);
      if ([60, 120, 180, 240].includes(durationNumber)) {
        validatedDuration = durationNumber;
      } else {
        console.warn(`지원되지 않는 음악 길이: ${duration}, 기본값 120초로 설정됩니다.`);
      }
    }
    
    // 1. 한국어 프롬프트를 영어로 번역
    console.log("1단계: 한국어 프롬프트 번역 시작");
    const translatedPrompt = await translateText(koreanPrompt, "english");
    console.log("번역된 프롬프트:", translatedPrompt);
    
    // 2. 한국어 가사를 영어로 번역
    console.log("2단계: 한국어 가사 번역 시작");
    const translatedLyrics = await translateText(koreanLyrics, "english");
    console.log("번역된 가사:", translatedLyrics);
    
    // 3. 프롬프트 강화
    const enhancedPrompt = `${translatedPrompt}, korean style, lullaby, high quality vocals, clear pronunciation`;
    
    // 4. ACE-Step 입력 파라미터 생성
    const input: AceStepInput = createAceStepInput(
      enhancedPrompt,
      translatedLyrics,
      validatedDuration,
      {
        // 가사 가이던스 강화
        lyric_guidance_scale: 12
      }
    );
    
    // 5. 음악 생성
    console.log("3단계: ACE-Step 음악 생성 시작");
    const audioUrl = await generateMusicWithAceStep(input);
    
    if (!audioUrl) {
      return res.status(500).json({ 
        error: "음악 생성에 실패했습니다." 
      });
    }
    
    res.status(200).json({
      success: true,
      audioUrl,
      originalPrompt: koreanPrompt,
      originalLyrics: koreanLyrics,
      translatedPrompt,
      translatedLyrics,
      duration: validatedDuration
    });
  } catch (error) {
    console.error("한국어 가사 테스트 API 오류:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다." 
    });
  }
});

// 다양한 길이 테스트 엔드포인트
router.post("/test-duration", async (req, res) => {
  try {
    const { prompt, lyrics, durations } = req.body;
    
    if (!prompt || !lyrics || !Array.isArray(durations)) {
      return res.status(400).json({ 
        error: "프롬프트, 가사 및 길이 배열이 필요합니다." 
      });
    }
    
    console.log("다양한 길이 테스트 요청:", { prompt, durations });
    
    const enhancedPrompt = `${prompt}, high quality, vocals, clear pronunciation`;
    const results = [];
    
    // 여러 길이로 음악 생성 (병렬 처리)
    const generationPromises = durations.map(async (duration) => {
      const durationNumber = parseInt(duration, 10);
      
      if (![60, 120, 180, 240].includes(durationNumber)) {
        return {
          duration: durationNumber,
          success: false,
          error: "지원되지 않는 길이입니다. 60, 120, 180, 240초 중 하나를 사용하세요."
        };
      }
      
      try {
        // ACE-Step 입력 파라미터 생성
        const input = createAceStepInput(
          enhancedPrompt,
          lyrics,
          durationNumber
        );
        
        // 음악 생성
        const startTime = Date.now();
        const audioUrl = await generateMusicWithAceStep(input);
        const generationTime = (Date.now() - startTime) / 1000;
        
        if (!audioUrl) {
          return {
            duration: durationNumber,
            success: false,
            error: "음악 생성에 실패했습니다."
          };
        }
        
        return {
          duration: durationNumber,
          success: true,
          audioUrl,
          generationTime: `${generationTime.toFixed(2)}초`
        };
      } catch (error) {
        return {
          duration: durationNumber,
          success: false,
          error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
        };
      }
    });
    
    const results2 = await Promise.all(generationPromises);
    
    res.status(200).json({
      success: true,
      prompt: enhancedPrompt,
      lyrics,
      results: results2
    });
  } catch (error) {
    console.error("다양한 길이 테스트 API 오류:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다." 
    });
  }
});

export default router;