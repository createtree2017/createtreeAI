import fetch from 'node-fetch';

// 음악 생성 API 테스트
async function testMusicGeneration() {
  console.log('음악 생성 API 테스트 시작...');
  
  try {
    const response = await fetch('http://localhost:5000/api/music-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'API-Test',
        prompt: 'Simple lullaby melody',
        duration: '60',
        styleTags: 'lullaby',
        voiceMode: 'ai',
        style: 'lullaby',
        babyName: 'TestBaby',
        voiceGender: 'female_kr',
        gender: 'female_kr',
        lyrics: 'Test lyrics\nTest lyrics\nTest lyrics'
      })
    });
    
    console.log('API 응답 상태:', response.status);
    
    if (response.ok) {
      console.log('음악 파일 다운로드 중...');
      const blob = await response.blob();
      console.log('음악 파일 크기:', blob.size);
      console.log('음악 파일 타입:', blob.type);
      console.log('API 테스트 성공: 음악 파일을 받았습니다.');
    } else {
      const errorData = await response.text();
      console.error('API 오류 응답:', errorData);
    }
  } catch (error) {
    console.error('API 테스트 실패:', error);
  }
}

// 테스트 실행
testMusicGeneration().then(() => console.log('테스트 완료'));