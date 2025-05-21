import express from 'express';
import { db } from "@db";
import { dreamBooks, dreamBookImages, DREAM_BOOK_STYLES } from '@shared/dream-book';
import { createDreamBookSchema, createCharacterSchema } from '@shared/dream-book';
import { generateDreamImage, generateCharacterImage, generateDreamSceneImage, getStylePrompt, SERVICE_UNAVAILABLE } from '../services/dream-service';
import { authMiddleware } from '../common/middleware/auth';
import { ZodError } from 'zod';
import { eq, and, asc, desc } from 'drizzle-orm';
import { imageStyles } from '@shared/schema';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// 파일 업로드 디렉토리 설정
const uploadDir = './uploads/dreambook';
const staticUploadDir = './static/uploads/dream-books';

// 업로드 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(staticUploadDir)) {
  fs.mkdirSync(staticUploadDir, { recursive: true });
}

// Multer 스토리지 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.originalname);
    cb(null, `dreambook-${Date.now()}-${uniqueId}${ext}`);
  }
});

// Multer 업로드 인스턴스 생성
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
});

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

// 태몽동화 생성 - FormData 처리를 위해 multer 적용
router.post('/', [authMiddleware, upload.none()], async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    // 세션에서 병원 ID가 있으면 사용 (타입 에러 수정)
    const hospitalId = req.session?.user?.hospitalId;

    // FormData에서 데이터 추출
    const formData = req.body;
    
    // FormData에서 필요한 필드 추출
    const babyName = formData.babyName;
    const dreamer = formData.dreamer || '';
    const styleId = formData.style; // 클라이언트에서는 style로 전송됨
    const characterImageUrl = formData.characterImageUrl;
    const peoplePrompt = formData.peoplePrompt || '아기는 귀엽고 활기찬 모습이다.';
    const backgroundPrompt = formData.backgroundPrompt || '환상적이고 아름다운 배경';
    
    // 장면 프롬프트는 JSON 문자열로 전송되었으므로 파싱 필요
    let scenePrompts = [];
    try {
      scenePrompts = JSON.parse(formData.scenePrompts);
    } catch (e) {
      logError('장면 프롬프트 파싱 오류:', e);
      scenePrompts = [];
    }
    
    // 빈 프롬프트 제거하고 입력된 것만 필터링
    const filteredScenePrompts = scenePrompts.filter((prompt: string) => prompt && prompt.trim().length > 0);
    
    // 기본 장면 수
    const numberOfScenes = filteredScenePrompts.length;
    
    if (filteredScenePrompts.length === 0) {
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
      // 1. 태몽동화 DB 레코드 생성 - 2단계 생성 방식
      sendStatus('태몽동화 정보를 저장하는 중...', 10);
      
      // 첫 번째 장면 프롬프트를 대표 내용으로, summaryText에는 간단한 설명 저장
      const summaryText = `${dreamer}가 꾼 ${babyName}의 태몽동화 (${filteredScenePrompts.length}개 장면)`;
      
      const [newDreamBook] = await db.insert(dreamBooks).values({
        userId: Number(userId),
        babyName,
        dreamer,
        dreamContent: filteredScenePrompts[0], // 첫 번째 프롬프트를 대표 내용으로 저장
        summaryText,
        style: styleId, // 스타일 ID 저장
        characterImageUrl, // 1차 생성된 캐릭터 이미지 URL
        characterPrompt: `${babyName}의 캐릭터`, // 캐릭터 참조용 프롬프트
        peoplePrompt, // 인물 표현 프롬프트
        backgroundPrompt, // 배경 표현 프롬프트
        numberOfScenes: filteredScenePrompts.length, // 장면 수
        hospitalId: hospitalId ? Number(hospitalId) : null,
        isPublic: false,
        updatedAt: new Date(),
      }).returning();

      const dreamBookId = newDreamBook.id;

      // 4. 태몽동화 장면 이미지 생성 (캐릭터 참조 포함)
      // 스타일 시스템 프롬프트가 일관되게 적용되도록 설정
      const systemPrompt = imageStyle.systemPrompt || '';
      const styleName = imageStyle.name || ''; // 스타일 이름 추가
      logInfo('이미지 생성에 사용할 스타일 정보', { 
        styleName,
        systemPromptLength: systemPrompt.length,
        promptCount: filteredScenePrompts.length
      });
      
      // 이미지 처리 결과 저장 배열
      const imageResults = [];
      
      // 각 프롬프트별로 순차적으로 이미지 생성
      for (let i = 0; i < filteredScenePrompts.length; i++) {
        const scenePrompt = filteredScenePrompts[i];
        const sequence = i + 1;
        
        try {
          // 진행 상황 업데이트
          sendStatus(`${sequence}/${filteredScenePrompts.length} 이미지를 생성하는 중...`, 20 + (i * 70 / filteredScenePrompts.length));
          
          // 이미지 생성에 사용할 스타일 정보 로깅 (디버깅용)
          logInfo(`이미지 생성 스타일 세부 정보`, {
            styleId,             // 원본 스타일 ID (예: 'ghibli')
            styleName,           // 스타일 이름 (예: '지브리풍')
            styleKey,            // 스타일 키 (예: 'ghibli')
            systemPromptSnippet: systemPrompt ? systemPrompt.substring(0, 50) + '...' : '없음'
          });
          
          // 프롬프트 정제 및 구성 (2단계 생성 방식)
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
          
          // 장면 프롬프트 정제 (스타일 지시어 제거)
          const sanitizedScenePrompt = sanitizePrompt(scenePrompt);
          
          // 캐릭터 프롬프트
          const characterReferencePrompt = `${babyName}의 캐릭터`;
          
          // 로깅 - 프롬프트 구성 요소 확인
          logInfo(`프롬프트 구성 요소`, {
            systemPromptLength: systemPrompt.length,
            characterPromptLength: characterReferencePrompt.length,
            peoplePromptLength: peoplePrompt.length,
            backgroundPromptLength: backgroundPrompt.length,
            scenePromptLength: sanitizedScenePrompt.length
          });
          
          try {
            // 고도화된 태몽동화 이미지 생성 (캐릭터 참조 포함)
            const imageUrl = await generateDreamSceneImage(
              sanitizedScenePrompt,
              characterReferencePrompt,
              systemPrompt,
              peoplePrompt,
              backgroundPrompt
            );
            
            // 생성된 이미지 정보 DB 저장
            const [savedImage] = await db.insert(dreamBookImages).values({
              dreamBookId,
              sequence,
              prompt: scenePrompt, // 장면 프롬프트 저장
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
              20 + (i * 70 / filteredScenePrompts.length), 'error');
            
            // 에러용 기본 이미지
            const errorImageUrl = 'https://placehold.co/600x400/e74c3c/ffffff?text=이미지+생성+실패';
            
            // 실패한 이미지 정보도 DB에 저장
            const [errorImage] = await db.insert(dreamBookImages).values({
              dreamBookId,
              sequence,
              prompt: scenePrompt,
              imageUrl: errorImageUrl
            }).returning();
            
            imageResults.push(errorImage);
          }
        } catch (seqError) {
          // 시퀀스 처리 중 오류 발생
          logError(`이미지 시퀀스 ${sequence} 처리 중 오류:`, seqError);
          
          // 경고만 표시하고 다음 이미지 계속 진행
          sendStatus(`장면 ${sequence}에서 오류가 발생했지만 계속 진행합니다.`, 
            20 + (i * 70 / filteredScenePrompts.length), 'warning');
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

// 이미 상단에서 multer 설정과 upload 인스턴스가 정의되어 있음

// 태몽동화 캐릭터 생성 API (FormData + 사진 업로드)
router.post('/character', [authMiddleware, upload.single('image')], async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    console.log('[INFO] 캐릭터 생성 요청 데이터:', { 
      body: req.body,
      file: req.file ? { 
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file uploaded' 
    });

    // 파일 업로드 확인
    if (!req.file) {
      return res.status(400).json({ 
        error: '입력 데이터가 올바르지 않습니다.', 
        details: [{ path: 'image', message: '이미지 파일을 업로드해주세요.' }] 
      });
    }

    // FormData에서 받은 데이터
    const babyName = req.body.babyName || '아기'; // 기본값 제공
    const styleId = req.body.style;

    // 스타일 ID만 필수로 검증 (아기 이름은 기본값 사용 가능)
    if (!styleId) {
      // 업로드된 파일 삭제
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('업로드된 파일 삭제 실패:', err);
        });
      }
      
      return res.status(400).json({ 
        error: '입력 데이터가 올바르지 않습니다.', 
        details: [
          { path: 'style', message: '스타일 ID는 필수입니다.' }
        ] 
      });
    }
    
    // 스타일 정보 직접 사용
    // 이미지 생성 API에 스타일 ID 직접 전달로 수정
    // 데이터베이스에서 스타일 정보 조회 - 스타일 ID를 직접 사용
    console.log('[DEBUG] 전달된 스타일 ID:', styleId);
    
    const imageStyle = await db.query.imageStyles.findFirst({
      where: eq(imageStyles.styleId, styleId)
    });
    
    if (!imageStyle) {
      // 스타일을 찾지 못한 경우 기본 스타일을 사용 (귀여운 스타일)
      console.log('[WARN] 스타일 ID에 해당하는 이미지 스타일을 찾을 수 없습니다. 기본 스타일 사용');
      // 업로드된 파일은 계속 사용
    }

    if (!imageStyle || !imageStyle.systemPrompt) {
      // 업로드된 파일 삭제
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('업로드된 파일 삭제 실패:', err);
        });
      }
      
      return res.status(400).json({ 
        error: '스타일 정보가 불완전합니다', 
        details: [{ path: 'style', message: '해당 스타일의 시스템 프롬프트가 없습니다.' }] 
      });
    }

    try {
      console.log('[INFO] 캐릭터 이미지 생성 시작 - 스타일:', imageStyle.name);
      console.log('[INFO] 업로드된 이미지 경로:', req.file.path);
      
      // 업로드된 이미지 파일 경로와 스타일 정보를 활용하여 캐릭터 이미지 생성
      // 이제 generateCharacterImage 함수는 이미지 파일을 입력으로 받아야 함
      // 프롬프트에 babyName 대신 "원본 사진의 인물"로 변경하여 업로드된 사진의 인물 특성을 보존
      // 캐릭터 생성에는 동화 시스템 프롬프트가 아닌 캐릭터 전용 프롬프트 사용
      const characterPrompt = imageStyle.characterPrompt || '업로드된 사진 속 인물을 기반으로 캐릭터를 생성하세요. 인물의 특징과 외모를 유지하면서, 해당 스타일에 맞게 생성해주세요.';
      console.log('[INFO] 캐릭터 생성에 사용할 프롬프트:', { 
        characterPrompt: characterPrompt.substring(0, 100) + '...',
        styleId: imageStyle.styleId,
        styleName: imageStyle.name
      });
      
      const characterImageUrl = await generateCharacterImage(
        "원본 사진의 인물을 기반으로 한 캐릭터", 
        characterPrompt, // systemPrompt 대신 characterPrompt 사용
        req.file.path // 업로드된 이미지 파일 경로 추가
      );
      
      if (characterImageUrl === SERVICE_UNAVAILABLE) {
        // 업로드된 파일 삭제
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('업로드된 파일 삭제 실패:', err);
        });
        
        return res.status(503).json({ 
          success: false,
          error: '서비스를 일시적으로 사용할 수 없습니다.',
          message: '캐릭터 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
        });
      }
      
      // 캐릭터 프롬프트 생성 (다음 단계에서 참조용)
      const characterReferencePrompt = `${babyName}의 캐릭터`;
      
      // 결과 반환 - 일반 JSON 응답으로 변경
      console.log('[INFO] 캐릭터 이미지 생성 완료:', characterImageUrl);
      
      // 처리 완료 후 임시 파일 삭제
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('업로드된 파일 삭제 실패:', err);
      });
      
      return res.status(200).json({ 
        success: true,
        result: {
          characterImageUrl,
          characterPrompt: characterReferencePrompt
        }
      });
    } catch (error) {
      // 업로드된 파일 삭제
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('업로드된 파일 삭제 실패:', err);
        });
      }
      
      logError('캐릭터 생성 중 오류 발생:', error);
      return res.status(500).json({ 
        success: false,
        error: '캐릭터 생성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    // 업로드된 파일 삭제
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('업로드된 파일 삭제 실패:', err);
      });
    }
    
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        error: '입력 데이터가 올바르지 않습니다.', 
        details: error.errors 
      });
    }
    
    logError('캐릭터 생성 중 오류 발생:', error);
    return res.status(500).json({ error: '캐릭터를 생성하는 중 오류가 발생했습니다.' });
  }
});

// 모듈로 내보내기
export default router;