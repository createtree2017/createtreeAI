import { Router } from 'express';
import { db } from '@db';
import { music } from '@shared/schema';
import { 
  createSongSchema, 
  generateMusic, 
  generateLyrics, 
  ALLOWED_MUSIC_STYLES 
} from '../services/music-service';
import { authMiddleware as isAuthenticated } from '../common/middleware/auth';
import { eq, and, desc, sql } from 'drizzle-orm';

const musicRouter = Router();

// 허용된 태그 목록 가져오기
musicRouter.get('/styles', (req, res) => {
  res.json(ALLOWED_MUSIC_STYLES);
});

// 가사 생성 엔드포인트
musicRouter.post('/lyrics', isAuthenticated, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string' || prompt.length < 3) {
      return res.status(400).json({ error: '올바른 프롬프트를 입력해주세요.' });
    }

    const lyrics = await generateLyrics(prompt);
    res.json({ lyrics });
  } catch (error) {
    console.error('가사 생성 오류:', error);
    res.status(500).json({ error: '가사를 생성하는데 실패했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

// 음악 생성 엔드포인트
musicRouter.post('/create', isAuthenticated, async (req, res) => {
  try {
    const result = createSongSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: '입력 형식이 잘못되었습니다.', details: result.error.format() });
    }

    const songResult = await generateMusic(result.data);
    
    // 음악 저장 (데이터베이스에 생성한 음악 저장)
    const [savedMusic] = await db.insert(music).values({
      title: req.body.title || '제목 없는 음악',
      prompt: songResult.prompt,
      translatedPrompt: songResult.translatedPrompt,
      tags: songResult.tags,
      url: songResult.audioUrl,
      lyrics: songResult.lyrics,
      instrumental: songResult.instrumental,
      userId: req.user?.id,
      duration: 60, // 기본값 60초 (실제 길이는 확인 필요)
      metadata: JSON.stringify({
        generationDate: new Date().toISOString(),
        model: 'riffusion',
        version: '1.0',
      }),
    }).returning();

    res.status(201).json({ 
      music: savedMusic,
      message: '음악이 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('음악 생성 오류:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : '음악 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' 
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
      where: (music, { eq }) => eq(music.userId, userId),
      orderBy: (music, { desc }) => [desc(music.createdAt)],
      limit,
      offset
    });
    
    // 총 개수 조회
    const totalCount = await db.select({
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(music)
      .where(eq(music.userId, userId));
    
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
      where: (music, { eq }) => eq(music.id, musicId)
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
        eq(music.userId, userId)
      )
    });
    
    if (!musicItem) {
      return res.status(404).json({ error: '삭제할 음악을 찾을 수 없거나 권한이 없습니다.' });
    }
    
    // 음악 삭제
    await db.delete(music).where(eq(music.id, musicId));
    
    res.json({ message: '음악이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('음악 삭제 오류:', error);
    res.status(500).json({ error: '음악을 삭제하는데 실패했습니다.' });
  }
});

export default musicRouter;