/**
 * 공유 모달 스크립트
 */

// 공유 기능 처리를 위한 간단한 함수들
(function() {
  // 클립보드에 텍스트 복사하는 함수
  window.copyToClipboard = function(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          // 성공 메시지나 UI 표시 가능
          console.log('텍스트가 클립보드에 복사되었습니다.');
          
          // 복사 성공 이벤트 발생 (UI에서 처리 가능)
          const event = new CustomEvent('clipboard:copied', { detail: { success: true } });
          document.dispatchEvent(event);
        })
        .catch(err => {
          console.error('클립보드 복사 실패:', err);
          
          // 복사 실패 이벤트 발생
          const event = new CustomEvent('clipboard:copied', { detail: { success: false, error: err } });
          document.dispatchEvent(event);
        });
    } else {
      console.warn('이 브라우저는 clipboard API를 지원하지 않습니다.');
      
      // 지원하지 않는 브라우저 이벤트 발생
      const event = new CustomEvent('clipboard:copied', { 
        detail: { success: false, error: 'Clipboard API not supported' } 
      });
      document.dispatchEvent(event);
    }
  };

  // 네이티브 공유 API 호출 함수
  window.nativeShare = function(data) {
    if (navigator.share) {
      navigator.share(data)
        .then(() => {
          console.log('콘텐츠가 공유되었습니다.');
          
          // 공유 성공 이벤트 발생
          const event = new CustomEvent('content:shared', { detail: { success: true } });
          document.dispatchEvent(event);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error('공유 실패:', err);
            
            // 공유 실패 이벤트 발생
            const event = new CustomEvent('content:shared', { detail: { success: false, error: err } });
            document.dispatchEvent(event);
          }
        });
    } else {
      console.warn('이 브라우저는 Web Share API를 지원하지 않습니다.');
      
      // 공유 API 미지원 이벤트 발생
      const event = new CustomEvent('content:shared', { 
        detail: { success: false, error: 'Web Share API not supported' } 
      });
      document.dispatchEvent(event);
      
      // 대체 방법으로 클립보드에 URL 복사
      if (data.url) {
        window.copyToClipboard(data.url);
      }
    }
  };

  console.log('공유 모달 스크립트가 로드되었습니다.');
})();