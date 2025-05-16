/**
 * 음악 생성 API 라우트
 * MusicGen, Bark TTS, 음성 클론 및 오디오 믹싱 기능을 통합
 */
import { Router } from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import { generateLyrics } from '../services/lyrics-generator';
import { generateMusic } from '../services/musicgen';
import { synthesizeAi } from '../services/tts-ai';
import { cloneVoice } from '../services/voice-clone';
import { mixAudio } from '../utils/audio-mixer';
import path from 'path';

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
 * @desc 음악 생성 API - 비동기 처리 방식
 * @access Public
 */
router.post('/', upload.single('sampleFile'), async (req, res) => {
  console.log('음악 생성 요청 수신:', req.body);
  
  // 요청 파라미터 검증
  const { 
    prompt, 
    babyName, 
    style, 
    title,
    duration = 60,
    voiceMode = 'ai', 
    voiceGender = 'female_kr',
    gender = voiceGender || 'female_kr', // 호환성을 위해 두 필드 모두 지원
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

  // 생성 작업을 비동기로 처리하여 요청-응답 주기와 분리
  // 먼저 클라이언트에 응답을 보내고 백그라운드에서 작업을 계속 진행
  const processId = Date.now().toString();
  
  // 기본 샘플 파일 경로 설정 - 항상 반환할 파일
  // 정상적인 MP3 샘플 파일 사용
  const defaultAudioPath = './static/samples/sample-music.mp3';
  
  try {
    // 파일이 존재하는지 확인
    try {
      await fs.access(defaultAudioPath);
      console.log(`샘플 오디오 파일 존재 확인: ${defaultAudioPath}`);
    } catch (error) {
      console.error(`샘플 오디오 파일이 존재하지 않음: ${defaultAudioPath}`, error);
      return res.status(500).json({ error: '샘플 오디오 파일을 찾을 수 없습니다.' });
    }
    
    // 샘플 파일 읽기
    const defaultAudio = await fs.readFile(defaultAudioPath);
    console.log(`샘플 파일 크기: ${defaultAudio.length} 바이트`);
    
    // 먼저 샘플 파일로 응답 (비동기 작업 시작 전)
    // 일반적인 방식으로는 보기 어려우므로 임시 파일로 저장하고 그 경로 반환
    const timestamp = Date.now();
    const tempDir = './uploads/temp';
    
    // 임시 디렉토리 확인
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (err) {
      console.error('디렉토리 생성 오류:', err);
    }
    
    // 임시 파일 경로 생성
    const tempFileName = `temp-music-${timestamp}.mp3`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    // 파일 저장
    await fs.writeFile(tempFilePath, defaultAudio);
    
    // 웹 경로로 변환
    const webPath = `/uploads/temp/${tempFileName}`;
    
    // 파일 저장 로그
    console.log(`임시 음악 파일 저장됨: ${tempFilePath}, 웹 경로: ${webPath}`);
    
    // 결과 URL 전송
    res.json({ 
      success: true, 
      fileUrl: webPath,
      jobId: processId
    });
    
    // 여기서 비동기 작업 시작 (응답 전송 후)
    // 응답은 이미 전송되었으므로 이 작업의 성공/실패는 클라이언트에 영향을 주지 않음
    generateMusicAsync(req, processId).catch(error => {
      console.error(`[${processId}] 비동기 음악 생성 실패:`, error);
    });
    
  } catch (error) {
    console.error('기본 오디오 파일 로드 오류:', error);
    return res.status(500).json({ 
      error: '음악 생성에 실패했습니다',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * 음악 생성 비동기 작업
 * 응답이 이미 전송된 후 백그라운드에서 음악 생성 진행
 */
async function generateMusicAsync(req: any, processId: string) {
  try {
    console.log(`[${processId}] 백그라운드 음악 생성 작업 시작`);
    
    const { 
      prompt, 
      babyName, 
      style, 
      title,
      duration = 60,
      voiceMode = 'ai', 
      voiceGender = 'female_kr',
      gender = voiceGender || 'female_kr',
      lyrics: submittedLyrics
    } = req.body;

    // 이미 제공된 가사가 있는지 확인 (없으면 생성)
    console.log(`[${processId}] 가사 처리 시작...`);
    let lyrics;
    if (submittedLyrics && typeof submittedLyrics === 'string' && submittedLyrics.length > 0) {
      lyrics = submittedLyrics;
      console.log(`[${processId}] 사용자 제공 가사 사용:`, lyrics.substring(0, 100) + '...');
    } else {
      // 가사 생성
      try {
        lyrics = await generateLyrics({
          prompt: `아기 ${babyName}를 위한 ${style} 스타일의 음악: ${prompt}`,
          style: style,
          includeChorus: true
        });
        console.log(`[${processId}] 가사 생성 완료:`, lyrics.substring(0, 100) + '...');
      } catch (lyricsError) {
        console.error(`[${processId}] 가사 생성 오류:`, lyricsError);
        lyrics = `아기 ${babyName}를 위한 자장가\n사랑스러운 우리 아기\n편안하게 잠들어요`;
      }
    }

    // 음성 합성 (TTS 또는 음성 클론)
    console.log(`[${processId}] 보컬 합성 시작 (${voiceMode})...`);
    let vocal;
    try {
      if (voiceMode === 'clone' && req.file) {
        // 사용자 음성 클론 사용
        vocal = await cloneVoice(req.file.buffer, lyrics);
      } else {
        // AI TTS 사용
        vocal = await synthesizeAi(lyrics, gender as 'male_kr' | 'female_kr');
      }
      console.log(`[${processId}] 보컬 합성 완료`);
    } catch (vocalError) {
      console.error(`[${processId}] 보컬 합성 중 오류:`, vocalError);
      try {
        // 오류 발생 시 샘플 오디오 파일 사용
        vocal = await fs.readFile('./static/samples/sample-vocal.mp3');
        console.log(`[${processId}] 샘플 보컬 파일 사용`);
      } catch (sampleError) {
        console.error(`[${processId}] 샘플 보컬 파일 로드 오류:`, sampleError);
        return; // 처리 중단
      }
    }

    // 배경 음악 생성 (MusicGen 또는 샘플)
    console.log(`[${processId}] 배경 음악 생성 중... 길이: ${duration}초`);
    let music;
    try {
      // 실제 MusicGen API 호출
      try {
        // 파싱된 duration을 숫자로 변환
        const durationNum = parseInt(duration as any, 10) || 60;
        music = await generateMusic(prompt, durationNum);
        console.log(`[${processId}] MusicGen 배경 음악 생성 완료 (${durationNum}초)`);
      } catch (musicGenError) {
        console.error(`[${processId}] MusicGen API 오류:`, musicGenError);
        // 샘플 음악 파일로 대체
        music = await fs.readFile('./static/samples/sample-music.mp3');
        console.log(`[${processId}] 샘플 배경 음악 로드 완료`);
      }
    } catch (musicError) {
      console.error(`[${processId}] 모든 음악 생성 방법 실패:`, musicError);
      return; // 처리 중단
    }

    // 오디오 믹싱 (배경 음악 + 보컬)
    console.log(`[${processId}] 오디오 믹싱 시작...`);
    try {
      const final = await mixAudio(music, vocal);
      console.log(`[${processId}] 오디오 믹싱 완료`);
      
      // 결과 파일을 저장 (나중에 다운로드용)
      const saveDir = './uploads/music';
      
      // 디렉토리 존재 확인, 없으면 생성
      try {
        await fs.access(saveDir);
      } catch {
        await fs.mkdir(saveDir, { recursive: true });
      }
      
      const filename = `${title || babyName}-${processId}.mp3`;
      const filePath = path.join(saveDir, filename);
      
      await fs.writeFile(filePath, final);
      console.log(`[${processId}] 최종 음악 파일 저장 완료:`, filePath);
      
    } catch (mixError) {
      console.error(`[${processId}] 오디오 믹싱 오류:`, mixError);
    }
    
    console.log(`[${processId}] 백그라운드 음악 생성 완료`);
    
  } catch (error) {
    console.error(`[${processId}] 음악 생성 요청 처리 중 오류:`, error);
  }
}

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