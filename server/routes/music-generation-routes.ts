/**
 * 음악 생성 API 라우트
 * MusicGen, Bark TTS, 음성 클론 및 오디오 믹싱 기능을 통합
 */
import { Router } from 'express';
import multer from 'multer';
import { generateLyrics } from '../services/lyrics-generator';
import { generateMusic } from '../services/musicgen';
import { synthesizeAi } from '../services/tts-ai';
import { cloneVoice } from '../services/voice-clone';
import { mixAudio } from '../utils/audio-mixer';

// 파일 업로드를 위한 Multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 최대 10MB 파일
  },
});

const router = Router();

/**
 * @route POST /api/music-generate
 * @desc 음악 생성 API - 비동기 처리 개선
 * @access Public
 */
router.post('/', upload.single('sampleFile'), async (req, res) => {
  try {
    console.log('음악 생성 요청 수신:', req.body);
    
    // 요청 파라미터 검증
    const { 
      prompt, 
      babyName, 
      style, 
      title,
      duration = 60,
      voiceOption = 'ai', 
      gender = 'female_kr',
      lyrics: submittedLyrics // 사용자가 직접 가사를 제공한 경우
    } = req.body;
    
    // 필수 매개변수 확인
    if (!prompt) {
      return res.status(400).json({ error: '음악 설명(prompt)이 필요합니다' });
    }
    
    if (!babyName) {
      return res.status(400).json({ error: '아기 이름(babyName)이 필요합니다' });
    }
    
    if (!style) {
      return res.status(400).json({ error: '음악 스타일(style)이 필요합니다' });
    }

    // 먼저 진행 상태 응답을 보내고 비동기 처리
    res.status(202).json({ 
      status: 'processing',
      message: '음악 생성이 시작되었습니다. 완료되면 결과가 반환됩니다.'
    });

    // 이미 제공된 가사가 있는지 확인 (없으면 생성)
    console.log('가사 처리 시작...');
    let lyrics;
    if (submittedLyrics && typeof submittedLyrics === 'string' && submittedLyrics.length > 0) {
      lyrics = submittedLyrics;
      console.log('사용자 제공 가사 사용:', lyrics.substring(0, 100) + '...');
    } else {
      // 가사 생성
      lyrics = await generateLyrics({
        prompt: `아기 ${babyName}를 위한 ${style} 스타일의 음악: ${prompt}`,
        style: style,
        includeChorus: true
      });
      console.log('가사 생성 완료:', lyrics.substring(0, 100) + '...');
    }

    // 응답은 이미 보냈으므로 백그라운드에서 처리 계속
    try {
      // 음성 합성 (TTS 또는 음성 클론)
      console.log(`보컬 합성 시작 (${voiceOption === 'custom' ? '사용자 음성' : 'AI 목소리'})...`);
      let vocal;
      if (voiceOption === 'custom' && req.file) {
        // 사용자 음성 클론 사용
        vocal = await cloneVoice(req.file.buffer, lyrics);
      } else {
        // AI TTS 사용
        vocal = await synthesizeAi(lyrics, gender as 'male_kr' | 'female_kr');
      }
      console.log('보컬 합성 완료');

      // 배경 음악 생성 
      console.log('배경 음악 생성 시작...');
      const durationInSeconds = parseInt(duration as string, 10) || 60;
      const validDuration = Math.min(Math.max(durationInSeconds, 60), 240);
      console.log(`음악 길이: ${validDuration}초로 설정`);
      const music = await generateMusic(prompt, validDuration);
      console.log('배경 음악 생성 완료');

      // 오디오 믹싱 (배경 음악 + 보컬)
      console.log('오디오 믹싱 시작...');
      const final = await mixAudio(music, vocal);
      console.log('오디오 믹싱 완료');

      // 생성된 음악 저장 (데이터베이스에 저장하는 로직 필요)
      console.log('생성된 음악 파일 처리 완료:', final.length, 'bytes');
      
      // TODO: 생성된 음악을 데이터베이스에 저장하는 로직 추가
      // const savedMusic = await saveGeneratedMusic(userId, title, final, {
      //   prompt, babyName, style, lyrics, duration: validDuration
      // });
      
    } catch (processingError) {
      console.error('백그라운드 음악 생성 중 오류 발생:', processingError);
      // 오류 발생 시 처리 (사용자에게 알림 등)
    }
  } catch (error) {
    console.error('음악 생성 요청 처리 중 오류가 발생했습니다:', error);
    // 초기 응답을 보내지 못한 경우에만 오류 응답
    if (!res.headersSent) {
      res.status(500).json({ 
        error: '음악 생성 요청 처리에 실패했습니다',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
});

/**
 * @route GET /api/music-generate/voices
 * @desc 사용 가능한 AI 음성 목록 반환
 * @access Public
 */
router.get('/voices', (req, res) => {
  // 사용 가능한 AI 음성 목록
  const voices = [
    { id: 'female_kr', name: '여성 (한국어)' },
    { id: 'male_kr', name: '남성 (한국어)' }
  ];
  
  res.json({ voices });
});

export default router;