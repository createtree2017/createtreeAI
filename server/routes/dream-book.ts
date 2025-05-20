import express from 'express';
import { db } from "@db";
import { dreamBooks, dreamBookImages } from '@shared/dream-book';
import { createDreamBookSchema } from '@shared/dream-book';
import { generateDreamStorySummary, generateDreamScenes, generateDreamImage } from '../services/openai-dream';
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
        eq(dreamBooks.userId, userId.toString())
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
    const { babyName, dreamer, dreamContent, style: styleId } = validatedData;

    // 스타일 ID로 이미지 스타일 정보 조회
    const imageStyle = await db.query.imageStyles.findFirst({
      where: eq(imageStyles.id, Number(styleId))
    });

    if (!imageStyle) {
      return res.status(400).json({ 
        error: '입력 데이터가 올바르지 않습니다.', 
        details: [{ path: 'style', message: '유효하지 않은 스타일입니다.' }] 
      });
    }

    // 실제 스타일 이름 추출
    const style = imageStyle.name;

    // 디버그 로깅
    logInfo('태몽동화 생성 스타일 정보', { styleId, styleName: style, systemPrompt: imageStyle.systemPrompt });

    // 상태 객체로 진행 상황 추적
    const status = { message: '태몽동화 생성을 시작합니다.', progress: 0 };
    // SSE 응답 헤더 설정
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // 진행 상황 전송 함수
    const sendStatus = (message: string, progress: number) => {
      status.message = message;
      status.progress = progress;
      res.write(`data: ${JSON.stringify(status)}\n\n`);
    };

    try {
      // 1. 태몽 내용을 바탕으로 동화 줄거리 생성
      sendStatus('태몽 내용을 바탕으로 동화 줄거리를 생성하는 중...', 10);
      const summaryText = await generateDreamStorySummary(dreamer, babyName, dreamContent);

      // 2. 줄거리를 바탕으로 4개의 장면 생성
      sendStatus('동화 장면 프롬프트를 생성하는 중...', 30);
      const scenePrompts = await generateDreamScenes(dreamContent, style, imageStyle.systemPrompt);

      // 3. 태몽동화 DB 레코드 생성
      sendStatus('태몽동화 정보를 저장하는 중...', 40);
      const [newDreamBook] = await db.insert(dreamBooks).values({
        userId: Number(userId),
        babyName,
        dreamer,
        dreamContent,
        summaryText,
        style: styleId, // 스타일 ID 저장
        hospitalId: hospitalId ? Number(hospitalId) : null,
        isPublic: false,
        updatedAt: new Date(),
      }).returning();

      const dreamBookId = newDreamBook.id;

      // 4. 각 장면에 대한 이미지 생성
      const imagePromises = scenePrompts.map(async (prompt, index) => {
        try {
          sendStatus(`${index + 1}/4 이미지를 생성하는 중...`, 50 + (index * 10));
          const imageUrl = await generateDreamImage(prompt);
          
          // 각 이미지를 DB에 저장
          const [newImage] = await db.insert(dreamBookImages).values({
            dreamBookId,
            sequence: index + 1,
            prompt,
            imageUrl,
          }).returning();
          
          return newImage;
        } catch (imgError) {
          logError(`이미지 ${index + 1} 생성 중 오류:`, imgError);
          throw imgError;
        }
      });

      // 모든 이미지 생성 완료 대기
      const images = await Promise.all(imagePromises);

      // 5. 최종 결과 반환
      sendStatus('태몽동화 생성이 완료되었습니다!', 100);
      const finalResult = {
        id: dreamBookId,
        ...newDreamBook,
        images,
      };
      
      res.write(`data: ${JSON.stringify({ ...status, completed: true, result: finalResult })}\n\n`);
      res.end();
    } catch (processError) {
      logError('태몽동화 생성 처리 중 오류:', processError);
      res.write(`data: ${JSON.stringify({ 
        message: '태몽동화 생성 중 오류가 발생했습니다.', 
        error: processError.message, 
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