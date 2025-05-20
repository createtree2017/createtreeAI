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

    // 세션에서 병원 ID가 있으면 사용 (타입 에러 수정)
    const hospitalId = req.session?.user?.hospitalId;

    // 입력 데이터 검증
    const validatedData = createDreamBookSchema.parse(req.body);
    const { babyName, dreamer, prompts, style: styleId } = validatedData;
    
    // 빈 프롬프트 제거하고 입력된 것만 필터링
    const filteredPrompts = prompts.filter(prompt => prompt.trim().length > 0);
    
    if (filteredPrompts.length === 0) {
      return res.status(400).json({ error: '최소 1개 이상의 장면 프롬프트를 입력해주세요.' });
    }

    // 스타일 ID로 이미지 스타일 정보 조회 (문자열 ID 사용)
    logInfo('태몽동화 생성 스타일 ID', { styleId, type: typeof styleId });
    
    // 1. 입력된 스타일 ID 검증 (빈 값이면 오류)
    if (!styleId) {
      logError('스타일 ID 오류', { error: '스타일 ID가 제공되지 않음' });
      return res.status(400).json({ 
        error: '입력 데이터가 올바르지 않습니다.', 
        details: [{ path: 'style', message: '스타일 ID는 필수입니다.' }] 
      });
    }
    
    // 2. 문자열 스타일 ID를 DREAM_BOOK_STYLES에서 확인
    const styleInfo = DREAM_BOOK_STYLES.find(s => s.id === styleId);
    if (!styleInfo) {
      logError('스타일 ID 오류', { error: '유효하지 않은 스타일 ID', styleId });
      return res.status(400).json({ 
        error: '입력 데이터가 올바르지 않습니다.', 
        details: [{ path: 'style', message: '유효하지 않은 스타일 ID입니다.' }] 
      });
    }
    
    // 3. 스타일 이름으로 데이터베이스에서 스타일 정보 조회
    const imageStyle = await db.query.imageStyles.findFirst({
      where: eq(imageStyles.name, styleInfo.name)
    });

    if (!imageStyle) {
      return res.status(400).json({ 
        error: '입력 데이터가 올바르지 않습니다.', 
        details: [{ path: 'style', message: '유효하지 않은 스타일입니다.' }] 
      });
    }

    // 이제 문자열 스타일 ID(예: 'ghibli')와 스타일 이름('지브리풍')을 모두 갖고 있음
    const styleName = styleInfo.name; // 스타일 이름 (예: '지브리풍')
    const styleKey = styleInfo.id;    // 스타일 키 (예: 'ghibli')
    
    // 시스템 프롬프트가 없으면 오류 반환 (fallback 방지)
    if (!imageStyle || !imageStyle.systemPrompt || imageStyle.systemPrompt.trim().length === 0) {
      logError('스타일 오류', { error: '시스템 프롬프트가 없는 스타일', styleId, styleName });
      return res.status(400).json({ 
        error: '스타일 정보가 불완전합니다', 
        details: [{ path: 'style', message: '해당 스타일의 시스템 프롬프트가 없습니다.' }] 
      });
    }

    // 디버그 로깅 (확인용)
    logInfo('태몽동화 생성 스타일 정보', { 
      styleId,          // 원본 스타일 ID (클라이언트에서 전송됨)
      styleKey,         // 스타일 키 (예: 'ghibli')
      styleName,        // 스타일 이름 (예: '지브리풍')
      systemPromptSnippet: imageStyle.systemPrompt.substring(0, 50) + '...'
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
            styleId,             // 원본 스타일 ID (예: 'ghibli')
            styleName,           // 스타일 이름 (예: '지브리풍')
            styleKey,            // 스타일 키 (예: 'ghibli')
            systemPromptSnippet: systemPrompt ? systemPrompt.substring(0, 50) + '...' : '없음'
          });
          
          // 작업지시서에 따라 프롬프트 우선순위 구조 완전 변경
          // 1. System: 시스템 프롬프트(스타일)가 항상 최우선
          // 2. User: 사용자 프롬프트(장면 설명)는 보조 정보로만 활용
          
          // 사용자 프롬프트에서 스타일 지시어 필터링 함수
          const sanitizePrompt = (rawPrompt: string): string => {
            // 스타일 지시어 패턴 (예: '지브리풍으로', '디즈니 스타일로', '파스텔톤으로' 등)
            const stylePatterns = [
              /지브리\s*풍/g, /디즈니\s*풍/g, /애니\s*풍/g, /사실적/g, /한국화/g, /수묵화/g,
              /스튜디오\s*지브리/g, /지브리\s*스타일/g, /디즈니\s*스타일/g,
              /파스텔\s*톤/g, /수채화\s*스타일/g, /애니메이션\s*스타일/g,
              /스타일로/g, /풍으로/g, /느낌으로/g, /분위기로/g
            ];
            
            let cleanedPrompt = rawPrompt;
            
            // 모든 스타일 지시어 패턴 제거
            stylePatterns.forEach(pattern => {
              cleanedPrompt = cleanedPrompt.replace(pattern, '');
            });
            
            // 중복 공백 제거
            cleanedPrompt = cleanedPrompt.replace(/\s+/g, ' ').trim();
            
            return cleanedPrompt;
          };
          
          // 사용자 프롬프트 정제 (스타일 지시어 제거)
          const sanitizedUserPrompt = sanitizePrompt(userPrompt);
          
          // 시스템 프롬프트와 사용자 프롬프트를 명확히 구분된 형식으로 구성
          let finalPrompt = `System: ${systemPrompt}\nUser: ${sanitizedUserPrompt}`;
          
          // 로깅 - 최종 프롬프트 구조 확인
          logInfo(`프롬프트 구조 재구성 완료`, {
            systemPromptLength: systemPrompt.length,
            originalUserPromptLength: userPrompt.length,
            sanitizedUserPromptLength: sanitizedUserPrompt.length,
            finalPromptLength: finalPrompt.length,
            containsSystemUserFormat: finalPrompt.includes("System:") && finalPrompt.includes("User:")
          });
          
          // 최종 프롬프트 내용 검증 (디버깅)
          logInfo(`최종 프롬프트 내용 검증`, {
            styleKeyUsed: styleKey,
            // 'styleKeyword' 변수가 사용되지 않음 - 제거 (LSP 오류 수정)
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
      // dreamBookId와 newDreamBook.id가 중복되는 문제 해결 (LSP 오류 수정)
      const { id, ...restDreamBook } = newDreamBook;
      const finalResult = {
        id: dreamBookId,
        ...restDreamBook,
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
// 태몽동화 썸네일 이미지 프록시 API (인증된 사용자만 접근 가능)
router.get('/:id/thumbnail', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const dreamBookId = parseInt(req.params.id);
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    // 해당 태몽동화 정보 조회
    const dreamBookWithImages = await db.query.dreamBooks.findFirst({
      where: eq(dreamBooks.id, dreamBookId),
      with: {
        images: {
          where: eq(dreamBookImages.sequence, 1), // 첫 번째 이미지 (썸네일)
        },
      },
    });
    
    if (!dreamBookWithImages) {
      return res.status(404).json({ error: '태몽동화를 찾을 수 없습니다.' });
    }
    
    // 권한 체크: 본인 태몽동화 또는 관리자만 접근 가능
    if (dreamBookWithImages.userId !== userId && req.session?.userRole !== 'admin' && req.session?.userRole !== 'superadmin') {
      return res.status(403).json({ error: '이 태몽동화에 접근할 권한이 없습니다.' });
    }
    
    // 이미지가 없는 경우
    if (!dreamBookWithImages.images || dreamBookWithImages.images.length === 0) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }
    
    const imageUrl = dreamBookWithImages.images[0].imageUrl;
    
    // 외부 이미지를 프록시
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: '이미지를 가져오는 중 오류가 발생했습니다.' });
    }
    
    // 이미지 데이터와 헤더 그대로 전달
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    
    // 이미지 데이터를 스트림으로 전달
    const imageData = await response.arrayBuffer();
    res.end(Buffer.from(imageData));
  } catch (error) {
    logError('태몽동화 썸네일 이미지 프록시 중 오류 발생:', error);
    return res.status(500).json({ error: '이미지를 가져오는 중 오류가 발생했습니다.' });
  }
});

export default router;