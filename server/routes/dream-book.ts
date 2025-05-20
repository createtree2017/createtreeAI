import express from 'express';
import { db } from "@db";
import { dreamBooks, dreamBookImages, DREAM_BOOK_STYLES } from '@shared/dream-book';
import { createDreamBookSchema } from '@shared/dream-book';
import { generateDreamImage, getStyleKeyword } from '../services/openai-dream';
import { authMiddleware } from '../common/middleware/auth';
import { ZodError } from 'zod';
import { eq, and, asc, desc } from 'drizzle-orm';
import { imageStyles } from '@shared/schema';

// 로깅 유틸리티가 없는 경우를 대비한 간단한 로거
const logInfo = (message: string, data?: any) => {
  console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
};

const logError = (message: string, error?: any) => {
  console.error(`[ERROR] ${message}`, error);
};

const router = express.Router();

// 모든 태몽동화 목록 조회 (사용자별)
router.get('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    // 조회 시 로그 추가
    logInfo('태몽동화 목록 조회 시작', { userId });
    
    const userDreamBooks = await db.query.dreamBooks.findMany({
      where: eq(dreamBooks.userId, userId),
      with: {
        images: true,
      },
      orderBy: [desc(dreamBooks.createdAt)],
    });

    return res.status(200).json(userDreamBooks);
  } catch (error) {
    logError('태몽동화 목록 조회 중 오류 발생:', error);
    return res.status(500).json({ error: '태몽동화 목록을 가져오는 중 오류가 발생했습니다.' });
  }
});

// 특정 태몽동화 조회
router.get('/:id', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const dreamBook = await db.query.dreamBooks.findFirst({
      where: and(
        eq(dreamBooks.id, parseInt(id)), 
        eq(dreamBooks.userId, Number(userId))
      ),
      with: {
        images: {
          orderBy: [asc(dreamBookImages.sequence)]
        },
      },
    });

    if (!dreamBook) {
      return res.status(404).json({ error: '태몽동화를 찾을 수 없습니다.' });
    }

    return res.status(200).json(dreamBook);
  } catch (error) {
    logError('태몽동화 조회 중 오류 발생:', error);
    return res.status(500).json({ error: '태몽동화를 가져오는 중 오류가 발생했습니다.' });
  }
});

// 태몽동화 생성
router.post('/', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const hospitalId = req.session?.hospitalId;

    // 입력 데이터 검증
    const validatedData = createDreamBookSchema.parse(req.body);
    const { babyName, dreamer, prompts, style: styleId } = validatedData;
    
    // 빈 프롬프트 제거하고 입력된 것만 필터링
    const filteredPrompts = prompts.filter(prompt => prompt.trim().length > 0);
    
    if (filteredPrompts.length === 0) {
      return res.status(400).json({ error: '최소 1개 이상의 장면 프롬프트를 입력해주세요.' });
    }

    // 스타일 ID로 이미지 스타일 정보 조회
    logInfo('태몽동화 생성 스타일 ID', { styleId, type: typeof styleId });
    
    let styleIdNumber: number;
    try {
      styleIdNumber = Number(styleId);
      if (isNaN(styleIdNumber)) {
        return res.status(400).json({ 
          error: '입력 데이터가 올바르지 않습니다.', 
          details: [{ path: 'style', message: '스타일 ID는 숫자여야 합니다.' }] 
        });
      }
    } catch (error) {
      logError('스타일 ID 변환 오류', error);
      return res.status(400).json({ 
        error: '입력 데이터가 올바르지 않습니다.', 
        details: [{ path: 'style', message: '스타일 ID는 숫자여야 합니다.' }] 
      });
    }
    
    const imageStyle = await db.query.imageStyles.findFirst({
      where: eq(imageStyles.id, styleIdNumber)
    });

    if (!imageStyle) {
      return res.status(400).json({ 
        error: '입력 데이터가 올바르지 않습니다.', 
        details: [{ path: 'style', message: '유효하지 않은 스타일입니다.' }] 
      });
    }

    // 실제 스타일 이름 추출
    const style = imageStyle.name;
    
    // 스타일 이름에서 DREAM_BOOK_STYLES의 ID를 찾기 (매핑용)
    let styleKey = "";
    for (const dreamStyle of DREAM_BOOK_STYLES) {
      if (dreamStyle.name === style) {
        styleKey = dreamStyle.id;
        break;
      }
    }
    
    // styleKey가 빈 문자열이면 스타일 이름 그대로 사용
    if (!styleKey) {
      styleKey = style.toLowerCase();
    }

    // 디버그 로깅
    logInfo('태몽동화 생성 스타일 정보', { 
      styleId, 
      styleName: style, 
      styleKey,
      systemPrompt: imageStyle.systemPrompt 
    });

    // 상태 객체로 진행 상황 추적
    const status = { message: '태몽동화 생성을 시작합니다.', progress: 0, type: 'info' };
    // SSE 응답 헤더 설정
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // 진행 상황 전송 함수
    const sendStatus = (message: string, progress: number, type = 'info') => {
      status.message = message;
      status.progress = progress;
      status.type = type;
      res.write(`data: ${JSON.stringify(status)}\n\n`);
    };

    try {
      // 1. 태몽동화 DB 레코드 생성 - 사용자가 직접 입력한 프롬프트 방식
      sendStatus('태몽동화 정보를 저장하는 중...', 10);
      
      // dreamContent 필드에는 첫 번째 프롬프트를 저장하고, summaryText에는 간단한 설명을 저장
      const summaryText = `사용자가 직접 입력한 ${filteredPrompts.length}개의 장면 프롬프트`;
      
      const [newDreamBook] = await db.insert(dreamBooks).values({
        userId: Number(userId),
        babyName,
        dreamer,
        dreamContent: filteredPrompts[0], // 첫 번째 프롬프트를 대표 내용으로 저장
        summaryText,
        style: styleId, // 스타일 ID 저장
        hospitalId: hospitalId ? Number(hospitalId) : null,
        isPublic: false,
        updatedAt: new Date(),
      }).returning();

      const dreamBookId = newDreamBook.id;

      // 4. 사용자가 직접 입력한 프롬프트로 이미지 생성
      // 스타일 시스템 프롬프트가 일관되게 적용되도록 설정
      const systemPrompt = imageStyle.systemPrompt || '';
      const styleName = imageStyle.name || ''; // 스타일 이름 추가
      logInfo('이미지 생성에 사용할 스타일 정보', { 
        styleName,
        systemPromptLength: systemPrompt.length,
        promptCount: filteredPrompts.length
      });
      
      // 이미지 처리 결과 저장 배열
      const imageResults = [];
      
      // 각 프롬프트별로 순차적으로 이미지 생성
      for (let i = 0; i < filteredPrompts.length; i++) {
        const userPrompt = filteredPrompts[i];
        const sequence = i + 1;
        
        try {
          // 진행 상황 업데이트
          sendStatus(`${sequence}/${filteredPrompts.length} 이미지를 생성하는 중...`, 20 + (i * 70 / filteredPrompts.length));
          
          // 이미지 생성에 사용할 스타일 정보 로깅 (디버깅용)
          logInfo(`이미지 생성 스타일 세부 정보`, {
            styleId: styleIdNumber,
            styleName: style,
            styleKey: styleKey,
            styleNameType: typeof style,
            styleNameLength: style.length,
            systemPromptSnippet: systemPrompt ? systemPrompt.substring(0, 50) + '...' : '없음'
          });
          
          // 작업지시서에 따라 DALL-E가 잘 인식할 수 있는 형식으로 정리
          // 스타일 키워드를 추출하는 함수로 스타일 이름 변환 (예: "지브리풍" -> "Studio Ghibli style")
          const styleKeyword = await getStyleKeyword(style);
          logInfo(`스타일 키워드 변환 결과`, { 
            originalStyle: style, 
            convertedStyleKeyword: styleKeyword 
          });
          
          // 스타일 지시가 중복되지 않도록 신중하게 구성
          const styleEmphasis = `IMPORTANT STYLE INSTRUCTION - Follow this style exactly: ${styleKeyword}, high quality, detailed, soft lighting`;
          
          // 시스템 프롬프트 (스타일별 세부 지시사항)와 사용자 프롬프트 결합
          let finalPrompt = `${styleEmphasis}\n`;
          
          // 시스템 프롬프트 추가 (있는 경우)
          if (systemPrompt && systemPrompt.trim().length > 0) {
            // 중복 방지: 시스템 프롬프트에 스타일 지시가 이미 포함되어 있는지 확인
            const hasStyleInstruction = systemPrompt.includes("IMPORTANT STYLE INSTRUCTION");
            
            if (hasStyleInstruction) {
              // 이미 스타일 지시가 포함된 경우 시스템 프롬프트만 사용
              finalPrompt = `${systemPrompt}\n\n`;
              logInfo('시스템 프롬프트에 스타일 지시가 이미 포함됨', { useSystemPromptOnly: true });
            } else {
              // 시스템 프롬프트에 스타일 지시가 없는 경우 둘 다 추가
              finalPrompt += `${systemPrompt}\n\n`;
            }
          }
          
          // 사용자 프롬프트 추가
          finalPrompt += userPrompt;
          
          // 프롬프트가 너무 짧은 경우 보완
          if (finalPrompt.length < 30) {
            finalPrompt = `${styleEmphasis}\n\nCreate a detailed illustration in ${styleName} style with the following description: ${userPrompt}`;
          }
          
          // 최종 프롬프트 내용 검증 (디버깅)
          logInfo(`최종 프롬프트 내용 검증`, {
            containsStyleName: finalPrompt.includes(styleName),
            containsSystemPrompt: systemPrompt ? finalPrompt.includes(systemPrompt.substring(0, 20)) : false,
            containsUserPrompt: finalPrompt.includes(userPrompt.substring(0, Math.min(10, userPrompt.length)))
          });
          
          // 프롬프트 정보 로깅
          logInfo(`이미지 ${sequence} 생성 프롬프트`, {
            userPromptLength: userPrompt.length,
            systemPromptLength: systemPrompt.length,
            finalPromptLength: finalPrompt.length
          });
          
          try {
            // OpenAI API로 이미지 생성
            const imageUrl = await generateDreamImage(finalPrompt);
            
            // 생성된 이미지 정보 DB 저장
            const [savedImage] = await db.insert(dreamBookImages).values({
              dreamBookId,
              sequence,
              prompt: userPrompt, // 사용자 입력 프롬프트만 저장
              imageUrl
            }).returning();
            
            imageResults.push(savedImage);
          } catch (error) {
            // 이미지 생성 실패 처리
            logError(`이미지 ${sequence} 생성 실패`, {
              error: error instanceof Error ? error.message : String(error)
            });
            
            // 사용자에게 오류 알림
            sendStatus(`이미지 ${sequence} 생성 중 오류가 발생했습니다. 내용이 부적절하거나 서버 문제일 수 있습니다.`, 
              20 + (i * 70 / filteredPrompts.length), 'error');
            
            // 에러용 기본 이미지
            const errorImageUrl = 'https://placehold.co/600x400/e74c3c/ffffff?text=이미지+생성+실패';
            
            // 실패한 이미지 정보도 DB에 저장
            const [errorImage] = await db.insert(dreamBookImages).values({
              dreamBookId,
              sequence,
              prompt: userPrompt,
              imageUrl: errorImageUrl
            }).returning();
            
            imageResults.push(errorImage);
          }
        } catch (seqError) {
          // 시퀀스 처리 중 오류 발생
          logError(`이미지 시퀀스 ${sequence} 처리 중 오류:`, seqError);
          
          // 경고만 표시하고 다음 이미지 계속 진행
          sendStatus(`장면 ${sequence}에서 오류가 발생했지만 계속 진행합니다.`, 
            20 + (i * 70 / filteredPrompts.length), 'warning');
        }
      }
      
      // 모든 이미지 처리 완료
      const images = imageResults;

      // 5. 최종 결과 반환
      sendStatus('태몽동화 생성이 완료되었습니다!', 100);
      const finalResult = {
        id: dreamBookId,
        ...newDreamBook,
        images,
      };
      
      res.write(`data: ${JSON.stringify({ 
        message: '태몽동화 생성이 완료되었습니다!', 
        progress: 100, 
        type: 'info',
        completed: true, 
        success: true,
        result: finalResult 
      })}\n\n`);
      res.end();
    } catch (processError) {
      logError('태몽동화 생성 처리 중 오류:', processError);
      res.write(`data: ${JSON.stringify({ 
        message: '태몽동화 생성 중 오류가 발생했습니다.', 
        progress: 0,
        type: 'error',
        error: processError instanceof Error ? processError.message : String(processError),
        completed: true, 
        success: false 
      })}\n\n`);
      res.end();
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        error: '입력 데이터가 올바르지 않습니다.', 
        details: error.errors 
      });
    }
    
    logError('태몽동화 생성 중 오류 발생:', error);
    return res.status(500).json({ error: '태몽동화를 생성하는 중 오류가 발생했습니다.' });
  }
});

// 모듈로 내보내기
export default router;