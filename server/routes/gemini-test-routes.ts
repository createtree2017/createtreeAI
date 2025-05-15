import { Router } from 'express';
import * as geminiLyricsService from '../services/gemini-lyrics-service';

const router = Router();

/**
 * Gemini API를 사용하여 가사 생성 테스트
 * POST /api/test-gemini/generate-lyrics
 */
router.post('/generate-lyrics', async (req, res) => {
  try {
    const { prompt, genre, mood, language, targetLength } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '프롬프트는 필수 항목입니다.' });
    }

    const lyrics = await geminiLyricsService.generateLyrics({
      prompt,
      genre,
      mood,
      language,
      targetLength
    });

    return res.json({ lyrics });
  } catch (error) {
    console.error('Gemini 가사 생성 테스트 중 오류 발생:', error);
    return res.status(500).json({
      error: '가사 생성 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Gemini API를 사용하여 음악 생성 프롬프트 테스트
 * POST /api/test-gemini/generate-music-prompt
 */
router.post('/generate-music-prompt', async (req, res) => {
  try {
    const { prompt, lyrics, style } = req.body;

    if (!prompt || !lyrics) {
      return res.status(400).json({ error: '프롬프트와 가사는 필수 항목입니다.' });
    }

    const musicPrompt = await geminiLyricsService.generateMusicPrompt(
      prompt,
      lyrics,
      style
    );

    return res.json({ musicPrompt });
  } catch (error) {
    console.error('Gemini 음악 프롬프트 생성 테스트 중 오류 발생:', error);
    return res.status(500).json({
      error: '음악 프롬프트 생성 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Gemini API를 사용하여 통합 테스트 (가사 + 음악 프롬프트 생성)
 * POST /api/test-gemini/generate-lyrics-and-prompt
 */
router.post('/generate-lyrics-and-prompt', async (req, res) => {
  try {
    const { prompt, genre, mood, style } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '프롬프트는 필수 항목입니다.' });
    }

    // 1. 가사 생성
    const lyrics = await geminiLyricsService.generateLyrics({
      prompt,
      genre,
      mood,
      language: 'korean'
    });

    // 2. 음악 프롬프트 생성
    const musicPrompt = await geminiLyricsService.generateMusicPrompt(
      prompt,
      lyrics,
      style || genre
    );

    return res.json({
      lyrics,
      musicPrompt,
      originalPrompt: prompt
    });
  } catch (error) {
    console.error('Gemini 통합 테스트 중 오류 발생:', error);
    return res.status(500).json({
      error: '가사 및 음악 프롬프트 생성 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Gemini API를 사용하여 번역 테스트
 * POST /api/test-gemini/translate
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ error: '번역할 텍스트는 필수 항목입니다.' });
    }

    const translatedText = await geminiLyricsService.translateText(
      text,
      targetLanguage || 'english'
    );

    return res.json({ translatedText });
  } catch (error) {
    console.error('Gemini 번역 테스트 중 오류 발생:', error);
    return res.status(500).json({
      error: '번역 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;