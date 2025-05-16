/**
 * 오디오 믹싱 유틸리티
 * 배경음악과 음성을 하나의 오디오 파일로 합치는 기능
 */
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 음악과 보컬을 믹싱하여 하나의 오디오 파일로 만듦
 * @param music 배경음악 버퍼
 * @param vocal 보컬 버퍼
 * @returns 믹싱된 오디오 버퍼
 */
export async function mixAudio(
  music: Buffer | ArrayBuffer,
  vocal: Buffer | ArrayBuffer
): Promise<Buffer> {
  try {
    // ArrayBuffer를 Buffer로 변환
    const musicBuffer = music instanceof ArrayBuffer ? Buffer.from(music) : music;
    const vocalBuffer = vocal instanceof ArrayBuffer ? Buffer.from(vocal) : vocal;

    // 임시 디렉토리 및 파일 경로 생성
    const tempDir = join(tmpdir(), `mix-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    const musicPath = join(tempDir, 'music.mp3');
    const vocalPath = join(tempDir, 'vocal.mp3');
    const outputPath = join(tempDir, 'output.mp3');
    
    // 임시 파일 저장
    await fs.writeFile(musicPath, musicBuffer);
    await fs.writeFile(vocalPath, vocalBuffer);
    
    console.log(`오디오 믹싱 시작 - 음악: ${musicBuffer.length} 바이트, 보컬: ${vocalBuffer.length} 바이트`);

    // ffmpeg을 사용한 믹싱
    return new Promise<Buffer>((resolve, reject) => {
      ffmpeg()
        // 입력 파일 추가
        .input(musicPath)
        .input(vocalPath)
        // 볼륨 조정 및 믹싱 필터 적용
        .complexFilter([
          '[0:a]volume=0.7[music]',  // 배경음악 볼륨 70%
          '[1:a]volume=1.3[vocal]',  // 보컬 볼륨 130%
          '[music][vocal]amix=inputs=2:duration=longest[out]'  // 두 오디오 믹싱
        ])
        .outputOptions([
          '-map [out]',
          '-c:a libmp3lame',  // MP3 인코딩
          '-b:a 192k',        // 비트레이트 설정
          '-metadata', 'title="Generated Music"'
        ])
        .output(outputPath)
        .on('end', async () => {
          try {
            // 결과 파일 읽어서 반환
            const outputBuffer = await fs.readFile(outputPath);
            console.log(`오디오 믹싱 완료 - 결과: ${outputBuffer.length} 바이트`);
            
            // 임시 파일 정리
            try {
              await fs.unlink(musicPath);
              await fs.unlink(vocalPath);
              await fs.unlink(outputPath);
              await fs.rmdir(tempDir);
            } catch (cleanupError) {
              console.warn('임시 파일 정리 중 오류:', cleanupError);
            }
            
            resolve(outputBuffer);
          } catch (error) {
            reject(new Error(`결과 파일 읽기 실패: ${error}`));
          }
        })
        .on('error', (error) => {
          console.error('ffmpeg 처리 중 오류:', error);
          reject(new Error(`ffmpeg 처리 실패: ${error.message}`));
        })
        .run();
    });
  } catch (error) {
    console.error('오디오 믹싱 중 오류가 발생했습니다:', error);
    throw new Error(`오디오 믹싱 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 시스템 확인
try {
  ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
      console.error('ffmpeg 포맷 확인 중 오류:', err);
    } else {
      console.log(`ffmpeg이 정상적으로 초기화되었습니다. ${Object.keys(formats || {}).length}개의 사용 가능한 형식`);
    }
  });
} catch (error) {
  console.error('ffmpeg 초기화 중 오류:', error);
}