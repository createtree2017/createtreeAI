import express from 'express';
import { db } from "@db";
import { dreamBooks, dreamBookImages, DREAM_BOOK_STYLES } from '@shared/dream-book';
import { createDreamBookSchema, createCharacterSchema } from '@shared/dream-book';
import { generateDreamImage, generateCharacterImage, generateDreamSceneImage, getStylePrompt, SERVICE_UNAVAILABLE, analyzeCharacterImage } from '../services/dream-service';
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
    
    // 전체 입력 데이터 로깅 (디버깅용)
    logInfo('태몽동화 생성 - 전체 요청 바디:', formData);
    
    // 장면 프롬프트는 JSON 문자열로 전송되었으므로 파싱 필요
    let scenePrompts = [];
    try {
      // FormData에서 전달된 형태에 따라 처리 방식 분기
      logInfo('scenePrompts 원시 데이터:', { 
        exists: formData.scenePrompts !== undefined,
        type: typeof formData.scenePrompts,
        value: formData.scenePrompts
      });
      
      if (typeof formData.scenePrompts === 'string') {
        // 문자열 형태로 받은 경우 (일반적인 경우)
        try {
          scenePrompts = JSON.parse(formData.scenePrompts);
          logInfo('장면 프롬프트를 문자열에서 파싱 성공:', { 
            length: scenePrompts.length,
            isArray: Array.isArray(scenePrompts)
          });
        } catch (parseError: any) {
          logError('JSON 파싱 오류 세부 정보:', { 
            error: parseError.message || '알 수 없는 오류',
            inputString: formData.scenePrompts
          });
          
          // 파싱 실패하면 단일 문자열로 취급
          if (formData.scenePrompts.trim().length > 0) {
            scenePrompts = [formData.scenePrompts];
            logInfo('단일 문자열로 처리:', { length: 1 });
          }
        }
      } else if (Array.isArray(formData.scenePrompts)) {
        // 이미 배열인 경우 그대로 사용
        scenePrompts = formData.scenePrompts;
        logInfo('장면 프롬프트가 이미 배열 형태임:', { length: scenePrompts.length });
      } else if (formData.scenePrompts === undefined || formData.scenePrompts === null) {
        logError('scenePrompts가 전송되지 않음');
        // 빈 배열 유지
      } else {
        // 예상치 못한 형식 (문자열, 배열 아님)
        logError('장면 프롬프트가 예상치 않은 형식임:', {
          type: typeof formData.scenePrompts,
          value: formData.scenePrompts
        });
      }
    } catch (e) {
      logError('장면 프롬프트 처리 중 예외 발생:', e);
      scenePrompts = [];
    }
    
    // 입력 데이터 로깅 (디버깅용)
    logInfo('태몽동화 생성 입력 데이터:', { 
      babyName, 
      style: styleId, 
      characterImageUrl: characterImageUrl ? '있음' : '없음',
      scenePromptType: typeof formData.scenePrompts,
      scenePromptCount: scenePrompts.length
    });
    
    // 디버깅: 원시 요청 출력
    console.log('요청 헤더:', req.headers);
    console.log('요청 본문 키:', Object.keys(req.body));
    console.log('scenePrompts 원시 값:', req.body.scenePrompts);
    
    // scenePrompts 타입 확인 및 예외 처리 로직 추가
    if (req.body.scenePrompts && typeof req.body.scenePrompts === 'string') {
      try {
        // scenePrompts 문자열 확인 로깅
        console.log('scenePrompts 문자열:', req.body.scenePrompts.substring(0, 100));
        
        // 문자열이 배열처럼 보이는지 확인
        const startsWithBracket = req.body.scenePrompts.trim().startsWith('[');
        const endsWithBracket = req.body.scenePrompts.trim().endsWith(']');
        console.log('배열 형식 확인:', { startsWithBracket, endsWithBracket });
      } catch (e) {
        console.error('문자열 검사 중 오류:', e);
      }
    }
    
    // 빈 프롬프트 제거하고 입력된 것만 필터링
    let filteredScenePrompts: string[] = [];
    
    // 배열인 경우만 필터링
    if (Array.isArray(scenePrompts)) {
      filteredScenePrompts = scenePrompts.filter((prompt: string) => prompt && prompt.trim().length > 0);
    } else {
      console.warn("scenePrompts가 배열이 아님:", typeof scenePrompts);
    }
    
    // 필터링 후에도 비어 있으면 기본값 할당
    if (filteredScenePrompts.length === 0) {
      console.log("🔴 scenePrompts 필터링 후 빈 배열. 기본값 사용");
      filteredScenePrompts = ['아이가 행복하게 웃고 있는 모습'];
    }
    
    // 기본 장면 수 (변수명 중복 방지를 위해 sceneCount로 변경)
    const sceneCount = filteredScenePrompts.length;
    
    logInfo('scenePrompts 처리 결과:', {
      원본: formData.scenePrompts,
      파싱결과: scenePrompts,
      필터링결과: filteredScenePrompts,
      장면수: sceneCount
    });
    
    // 장면 프롬프트가 없는 경우는 이미 위에서 기본값 설정했으므로 여기서는 체크하지 않음
    // 로그만 추가
    console.log('최종 검증 전 장면 데이터:', {
      갯수: filteredScenePrompts.length,
      내용: filteredScenePrompts
    });
    
    // 검증용 데이터 객체 생성 (FormData를 직접 쓰지 않고 새 객체 구성)
    // ⭐ Zod 스키마와 필드명 일치시키기: style, scenePrompts 등
    
    // scenePrompts 최종 검증
    console.log('scenePrompts 최종 확인:', { filteredScenePrompts, type: typeof filteredScenePrompts });
    
    // 1개 이상의 값이 있는지 확인 
    // (기존 로직 수정-필터링은 이미 앞에서 처리했으므로 여기서는 로깅만)
    console.log('장면 수 최종 결정:', filteredScenePrompts.length);
    
    const validationData = {
      babyName: babyName || '',
      dreamer: dreamer || '엄마',
      style: styleId, // 클라이언트에서 'style'로 전송, Zod 스키마도 'style'로 정의됨
      characterImageUrl: characterImageUrl || '',
      peoplePrompt: peoplePrompt || '아기는 귀엽고 활기찬 모습이다.',
      backgroundPrompt: backgroundPrompt || '환상적이고 아름다운 배경',
      numberOfScenes: sceneCount,
      scenePrompts: filteredScenePrompts
    };
    
    // 디버깅용 로그
    logInfo('Zod 스키마 검증 전 데이터', {
      validationData: validationData,
      scenePromptsType: Array.isArray(validationData.scenePrompts) ? '배열' : typeof validationData.scenePrompts,
      scenePromptsCount: Array.isArray(validationData.scenePrompts) ? validationData.scenePrompts.length : 0,
      styleType: typeof validationData.style
    });
    
    // scenePrompts 재검증 및 수정 (마지막 안전장치)
    console.log("최종 검증 전 scenePrompts 상태:", {
      isArray: Array.isArray(validationData.scenePrompts),
      length: validationData.scenePrompts ? validationData.scenePrompts.length : 0,
      value: validationData.scenePrompts
    });
    
    // 배열이 아니거나 빈 배열인 경우 강제로 기본값 설정
    if (!Array.isArray(validationData.scenePrompts) || validationData.scenePrompts.length === 0) {
      console.log("⚠️ scenePrompts 강제 보정 - 유효한 배열이 아님");
      validationData.scenePrompts = ["아이가 행복하게 웃고 있는 모습"];
      validationData.numberOfScenes = 1;
    }
    
    // Zod 스키마로 데이터 검증 - safeParse 사용
    console.log("최종 검증 데이터:", JSON.stringify(validationData, null, 2));
    const validation = createDreamBookSchema.safeParse(validationData);
    
    if (!validation.success) {
      // 전체 오류 상세 내용 출력 (flatten 결과 포함)
      console.error('🛑 Zod 스키마 검증 실패:', JSON.stringify(validation.error.flatten(), null, 2));
      console.error('❗ 검증 실패 입력값:', JSON.stringify(validationData, null, 2));
      
      logError('Zod 스키마 검증 실패', {
        input: validationData,
        error: validation.error.format(),
        flatten: validation.error.flatten(),
        issues: validation.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      });
      
      // 클라이언트에 보다 상세한 오류 정보 제공
      return res.status(400).json({
        error: '입력 데이터가 올바르지 않습니다.',
        details: validation.error.flatten(), // 전체 오류 정보를 클라이언트에도 전달
        fields: validation.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    
    // 검증 성공 로그
    logInfo('Zod 스키마 검증 성공', { validated: true });
    
    // 필수 필드 검증 (Zod 검증은 이미 위에서 했으나, 이중 검증)
    if (!babyName) {
      return res.status(400).json({ error: '아기 이름은 필수 입력 항목입니다.' });
    }
    
    if (!styleId) {
      return res.status(400).json({ error: '스타일을 선택해주세요.' });
    }
    
    if (!characterImageUrl) {
      return res.status(400).json({ error: '캐릭터 이미지 생성이 필요합니다. 먼저 캐릭터를 생성해주세요.' });
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
      
      // scene0ImageUrl 처리
      let scene0ImageUrl = characterImageUrl;
      
      // body에 scene0ImageUrl이 있으면 사용
      if (typeof req.body.scene0ImageUrl === 'string' && req.body.scene0ImageUrl) {
        scene0ImageUrl = req.body.scene0ImageUrl;
      }
      
      // 통합 이미지 로그 기록
      logInfo('캐릭터+배경 통합 이미지 정보', { 
        hasScene0Image: !!req.body.scene0ImageUrl,
        scene0ImageUrl: scene0ImageUrl ? '있음' : '없음'
      });
      
      const [newDreamBook] = await db.insert(dreamBooks).values({
        userId: Number(userId),
        babyName,
        dreamer,
        dreamContent: filteredScenePrompts[0], // 첫 번째 프롬프트를 대표 내용으로 저장
        summaryText,
        style: styleId, // 스타일 ID 저장
        characterImageUrl, // 1차 생성된 캐릭터 이미지 URL
        scene0ImageUrl, // 캐릭터+배경 통합 이미지 URL 추가
        characterPrompt: `캐릭터`, // 캐릭터 참조용 프롬프트 (아기 이름은 저장용으로만 사용)
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
      
      // 캐릭터 이미지 분석 (GPT-4o Vision 활용)
      sendStatus('캐릭터 분석 중...', 15);
      logInfo('캐릭터 이미지 GPT-4o Vision 분석 시작', { characterImageUrl });
      
      // 캐릭터 상세 분석 요청
      let characterAnalysis = '';
      try {
        characterAnalysis = await analyzeCharacterImage(characterImageUrl);
        logInfo('캐릭터 분석 완료', { 
          analysisLength: characterAnalysis.length,
          snippet: characterAnalysis.substring(0, 100) + '...'
        });
      } catch (analysisError) {
        logError('캐릭터 분석 중 오류 발생', analysisError);
        // 분석 실패해도 계속 진행 (핵심 기능 아님)
      }
      
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
          
          // 캐릭터 프롬프트 - 캐릭터 일관성을 위해 확장
          // 캐릭터 이미지 URL을 바탕으로 더 상세한 참조 프롬프트 생성
          // 아기 이름을 사용하지 않고 캐릭터 참조만 사용하도록 수정
          const characterReferencePrompt = `
앞서 생성된 캐릭터 이미지(${characterImageUrl})와 일관성 있게 표현해야 합니다.
모든 장면에서 캐릭터의 얼굴 특징, 헤어스타일, 의상 스타일을 동일하게 유지하세요.
${peoplePrompt}의 특징을 반영하되, 앞서 생성된 캐릭터와 시각적으로 일치하도록 표현해주세요.`;
          
          // 로깅 - 프롬프트 구성 요소 확인
          logInfo(`프롬프트 구성 요소`, {
            systemPromptLength: systemPrompt.length,
            characterPromptLength: characterReferencePrompt.length,
            peoplePromptLength: peoplePrompt.length,
            backgroundPromptLength: backgroundPrompt.length,
            scenePromptLength: sanitizedScenePrompt.length
          });
          
          try {
            // 고도화된 태몽동화 이미지 생성 (캐릭터 참조 포함 + GPT-4o Vision 분석 데이터)
            const imageUrl = await generateDreamSceneImage(
              sanitizedScenePrompt,
              characterReferencePrompt,
              systemPrompt,
              peoplePrompt,
              backgroundPrompt,
              characterAnalysis // GPT-4o Vision으로 분석한 캐릭터 상세 설명 추가
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
    const backgroundDescription = req.body.backgroundDescription || '환상적이고 아름다운 배경'; // 배경 설명 추가

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
      
      // 캐릭터 생성 프롬프트에 배경 설명 추가
      const characterWithBackgroundPrompt = `${characterPrompt}
      
이 이미지는 사용자가 업로드한 인물 사진을 바탕으로 ${imageStyle.name || '디즈니'} 스타일 캐릭터로 표현한 것입니다.
배경은 사용자가 입력한 설명을 참고하여 함께 그려주세요.
배경 설명: ${backgroundDescription}`;

      console.log('[INFO] 캐릭터+배경 생성에 사용할 프롬프트:', {
        backgroundDescription,
        fullPromptPreview: characterWithBackgroundPrompt.substring(0, 150) + '...'
      });
      
      const characterImageUrl = await generateCharacterImage(
        "원본 사진의 인물을 기반으로 한 캐릭터와 배경", 
        characterWithBackgroundPrompt, // 배경 설명이 포함된 프롬프트 사용
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
      console.log('[INFO] 캐릭터+배경 이미지 생성 완료:', characterImageUrl);
      
      // 처리 완료 후 임시 파일 삭제
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('업로드된 파일 삭제 실패:', err);
      });
      
      return res.status(200).json({ 
        success: true,
        result: {
          characterImageUrl,
          scene0ImageUrl: characterImageUrl, // 캐릭터+배경 이미지를 scene0ImageUrl로 설정
          characterPrompt: characterReferencePrompt,
          backgroundDescription // 배경 설명도 함께 반환
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