import { Router } from 'express';
import { db } from '@db';
import { music } from '@shared/schema';
import { 
  createSongSchema, 
  generateMusic, 
  ALLOWED_MUSIC_STYLES 
} from '../services/music-service';
import { generateLyrics, generateLyricsSchema } from '../services/lyrics-service';
import { authMiddleware as isAuthenticated } from '../common/middleware/auth';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const musicRouter = Router();

// 허용된 태그 목록 가져오기
musicRouter.get('/styles', (req, res) => {
  res.json(ALLOWED_MUSIC_STYLES);
});

// 가사 생성 엔드포인트
musicRouter.post('/lyrics', isAuthenticated, async (req, res) => {
  try {
    // lyrics-service에서 가져온 스키마 활용
    const result = generateLyricsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: '입력 형식이 잘못되었습니다.', 
        details: result.error.format() 
      });
    }

    console.log(`가사 생성 요청: ${JSON.stringify(result.data)}`);
    
    // 개선된 lyrics-service의 함수 활용
    const lyrics = await generateLyrics(result.data);
    
    // 성공 응답
    res.json({ 
      success: true,
      lyrics: lyrics,
      prompt: result.data.prompt,
      genre: result.data.genre,
      mood: result.data.mood,
      language: result.data.language
    });
  } catch (error) {
    console.error('가사 생성 오류:', error);
    res.status(500).json({ 
      success: false,
      error: '가사를 생성하는데 실패했습니다. 잠시 후 다시 시도해주세요.',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// 음악 생성 엔드포인트
musicRouter.post('/create', isAuthenticated, async (req, res) => {
  try {
    const result = createSongSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: '입력 형식이 잘못되었습니다.', details: result.error.format() });
    }

    // 사용자 ID 확인
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    
    try {
      // 음악 생성 (최대 3번 시도)
      const songResult = await generateMusic(result.data);
      
      // 음악 저장 (데이터베이스에 생성한 음악 저장)
      const insertData = {
        title: req.body.title || '제목 없는 음악',
        prompt: songResult.prompt,
        translatedPrompt: songResult.translatedPrompt,
        tags: songResult.tags,
        url: songResult.audioUrl,
        lyrics: songResult.lyrics,
        instrumental: songResult.instrumental,
        userId: userId,
        duration: 60, // 기본값 60초 (실제 길이는 확인 필요)
        metadata: JSON.stringify({
          generationDate: new Date().toISOString(),
          model: 'musicgen-melody',
          version: '1.0',
          style: req.body.style || 'general',
        }),
      };
      
      // DB 저장 시도
      const [savedMusic] = await db.insert(music).values(insertData).returning();
      
      // 성공 응답
      res.status(201).json({ 
        music: savedMusic,
        message: '음악이 성공적으로 생성되었습니다.'
      });
    } catch (generationError) {
      console.error('음악 생성 중 오류:', generationError);
      // 음악 생성 단계에서 오류 발생 시
      return res.status(500).json({ 
        error: '음악 생성 중 오류가 발생했습니다.', 
        message: generationError instanceof Error ? generationError.message : String(generationError)
      });
    }
    
  } catch (error) {
    // 전체 프로세스 오류 처리
    console.error('음악 생성 요청 처리 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '음악 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
    const statusCode = errorMessage.includes('인증') || errorMessage.includes('로그인') ? 401 : 500;
    
    res.status(statusCode).json({ 
      error: errorMessage
    });
  }
});

// 사용자 음악 목록 가져오기
musicRouter.get('/list', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // 페이지네이션 파라미터
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    // 사용자 음악 목록 조회
    const musicList = await db.query.music.findMany({
      where: (music, { eq }) => eq(music.userId, Number(userId)),
      orderBy: (music, { desc }) => [desc(music.createdAt)],
      limit,
      offset
    });
    
    // 총 개수 조회
    const totalCount = await db.select({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(music)
      .where(eq(music.userId, Number(userId)));
    
    res.json({
      music: musicList,
      meta: {
        page,
        limit,
        totalCount: Number(totalCount[0]?.count || 0),
        totalPages: Math.ceil(Number(totalCount[0]?.count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('음악 목록 조회 오류:', error);
    res.status(500).json({ error: '음악 목록을 가져오는데 실패했습니다.' });
  }
});

// 음악 세부 정보 조회
musicRouter.get('/:id', async (req, res) => {
  try {
    const musicId = parseInt(req.params.id);
    
    if (isNaN(musicId)) {
      return res.status(400).json({ error: '유효하지 않은 음악 ID입니다.' });
    }
    
    const musicItem = await db.query.music.findFirst({
      where: (music, { eq }) => eq(music.id, Number(musicId))
    });
    
    if (!musicItem) {
      return res.status(404).json({ error: '음악을 찾을 수 없습니다.' });
    }
    
    res.json(musicItem);
  } catch (error) {
    console.error('음악 조회 오류:', error);
    res.status(500).json({ error: '음악 정보를 가져오는데 실패했습니다.' });
  }
});

// 음악 파일 다운로드 엔드포인트
musicRouter.get('/:id/download', isAuthenticated, async (req, res) => {
  try {
    const musicId = Number(req.params.id);
    const userId = req.user?.id;
    
    if (isNaN(musicId)) {
      return res.status(400).json({ error: '유효하지 않은 음악 ID입니다.' });
    }
    
    // 음악 정보 조회
    const musicItem = await db.query.music.findFirst({
      where: (music, { eq }) => eq(music.id, Number(musicId))
    });
    
    if (!musicItem) {
      return res.status(404).json({ error: '음악을 찾을 수 없습니다.' });
    }
    
    // URL이 없는 경우 오류 처리
    if (!musicItem.url) {
      return res.status(404).json({ error: '음악 파일을 찾을 수 없습니다.' });
    }
    
    // 원격 URL에서 음악 파일 가져오기
    try {
      const response = await fetch(musicItem.url);
      
      if (!response.ok) {
        throw new Error(`원격 서버 응답 오류: ${response.status} ${response.statusText}`);
      }
      
      // 컨텐츠 타입 헤더 설정
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      
      // 다운로드 파일명 설정
      const filename = `${musicItem.title || `music-${musicId}`}.mp3`;
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      // 스트림으로 응답
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
      
    } catch (fetchError) {
      console.error('음악 파일 가져오기 오류:', fetchError);
      return res.status(500).json({ error: '음악 파일을 다운로드할 수 없습니다.' });
    }
    
  } catch (error) {
    console.error('음악 다운로드 처리 오류:', error);
    res.status(500).json({ error: '음악 다운로드에 실패했습니다.' });
  }
});

// 음악 공유하기 엔드포인트 (ID 파라미터 방식)
musicRouter.post('/:id/share', isAuthenticated, async (req, res) => {
  try {
    const musicId = Number(req.params.id);
    const userId = req.user?.id;
    
    if (isNaN(musicId)) {
      return res.status(400).json({ error: '유효하지 않은 음악 ID입니다.' });
    }
    
    // 음악 정보 조회
    const musicItem = await db.query.music.findFirst({
      where: (music, { eq }) => eq(music.id, Number(musicId))
    });
    
    if (!musicItem) {
      return res.status(404).json({ error: '음악을 찾을 수 없습니다.' });
    }
    
    // 공유 상태로 업데이트 (이제 실제 isPublic 필드 사용)
    const isAlreadyPublic = musicItem.isPublic === true;
    
    if (!isAlreadyPublic) {
      await db.update(music)
        .set({ isPublic: true })
        .where(eq(music.id, Number(musicId)));
    }
    
    // 공유 URL 생성
    const shareUrl = `${req.protocol}://${req.get('host')}/shared/music/${musicId}`;
    
    res.json({ 
      success: true, 
      shareUrl,
      message: '음악이 성공적으로 공유되었습니다.'
    });
    
  } catch (error) {
    console.error('음악 공유 처리 오류:', error);
    res.status(500).json({ error: '음악 공유에 실패했습니다.' });
  }
});

// 음악 공유하기 엔드포인트 (요청 본문 musicId 방식)
musicRouter.post('/share', isAuthenticated, async (req, res) => {
  try {
    const { musicId } = req.body;
    const userId = req.user?.id;
    
    if (!musicId || isNaN(Number(musicId))) {
      return res.status(400).json({ error: '유효하지 않은 음악 ID입니다.' });
    }
    
    // 음악 정보 조회
    const musicItem = await db.query.music.findFirst({
      where: (music, { eq }) => eq(music.id, Number(musicId))
    });
    
    if (!musicItem) {
      return res.status(404).json({ error: '음악을 찾을 수 없습니다.' });
    }
    
    // 공유 상태로 업데이트 (이제 실제 isPublic 필드 사용)
    const isAlreadyPublic = musicItem.isPublic === true;
    
    if (!isAlreadyPublic) {
      await db.update(music)
        .set({ isPublic: true })
        .where(eq(music.id, Number(musicId)));
    }
    
    // 공유 URL 생성
    const shareUrl = `${req.protocol}://${req.get('host')}/shared/music/${musicId}`;
    
    res.json({ 
      success: true, 
      shareUrl,
      message: '음악이 성공적으로 공유되었습니다.'
    });
    
  } catch (error) {
    console.error('음악 공유 처리 오류:', error);
    res.status(500).json({ error: '음악 공유에 실패했습니다.' });
  }
});

// 특정 공유 음악 조회
musicRouter.get('/shared/:id', async (req, res) => {
  try {
    const musicId = Number(req.params.id);
    
    if (isNaN(musicId)) {
      return res.status(400).json({ error: '유효하지 않은 음악 ID입니다.' });
    }
    
    // 음악 정보 조회
    const musicItem = await db.query.music.findFirst({
      where: (music, { eq }) => eq(music.id, Number(musicId))
    });
    
    if (!musicItem) {
      return res.status(404).json({ error: '음악을 찾을 수 없습니다.' });
    }
    
    // 공유 상태 확인 (isPublic 필드 사용)
    const isPublic = musicItem.isPublic === true;
    
    // 공유되지 않은 음악에 대한 접근 제한
    if (!isPublic) {
      return res.status(403).json({ error: '이 음악은 공개되지 않았습니다.' });
    }
    
    // 민감한 정보 제거 후 반환
    const safeMusic = {
      id: musicItem.id,
      title: musicItem.title,
      url: musicItem.url,
      lyrics: musicItem.lyrics,
      instrumental: musicItem.instrumental,
      duration: musicItem.duration,
      createdAt: musicItem.createdAt
    };
    
    res.json(safeMusic);
  } catch (error) {
    console.error('공유 음악 조회 오류:', error);
    res.status(500).json({ error: '음악 정보를 가져오는데 실패했습니다.' });
  }
});

// 공유된 음악 목록 조회
musicRouter.get('/shared', async (req, res) => {
  try {
    // 페이지네이션 파라미터
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    // 데이터베이스에서 공유된 음악 조회
    const sharedMusic = await db.query.music.findMany({
      where: (music, { eq }) => eq(music.isPublic, true),
      orderBy: (music, { desc }) => [desc(music.createdAt)],
      limit,
      offset
    });
    
    // 총 개수 조회
    const totalCount = await db.select({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(music)
      .where(eq(music.isPublic, true));
    
    // 민감한 정보 제거
    const safeMusic = sharedMusic.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
      duration: item.duration,
      createdAt: item.createdAt
    }));
    
    res.json({
      music: safeMusic,
      meta: {
        page,
        limit,
        totalCount: Number(totalCount[0]?.count || 0),
        totalPages: Math.ceil(Number(totalCount[0]?.count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('공유 음악 목록 조회 오류:', error);
    res.status(500).json({ error: '공유 음악 목록을 가져오는데 실패했습니다.' });
  }
});

// 음악 삭제
musicRouter.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const musicId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (isNaN(musicId)) {
      return res.status(400).json({ error: '유효하지 않은 음악 ID입니다.' });
    }
    
    // 먼저 해당 음악이 존재하고 사용자의 것인지 확인
    const musicItem = await db.query.music.findFirst({
      where: (music, { and, eq }) => and(
        eq(music.id, musicId),
        eq(music.userId, Number(userId))
      )
    });
    
    if (!musicItem) {
      return res.status(404).json({ error: '삭제할 음악을 찾을 수 없거나 권한이 없습니다.' });
    }
    
    // 음악 삭제
    await db.delete(music).where(eq(music.id, Number(musicId)));
    
    res.json({ message: '음악이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('음악 삭제 오류:', error);
    res.status(500).json({ error: '음악을 삭제하는데 실패했습니다.' });
  }
});

export default musicRouter;