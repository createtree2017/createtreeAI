/**
 * 서버 유틸리티 함수 모음
 */

/**
 * 한글 인코딩 문제를 해결하기 위한 향상된 디코딩 함수
 * @param text 디코딩할 텍스트
 * @returns 디코딩된 텍스트
 */
export function decodeKoreanText(text: string): string {
  if (!text) return '';
  
  try {
    // 이미 디코딩된 텍스트인지 확인 (UTF-8 깨짐 문자나 UTF-8 변환 패턴이 없는 경우)
    if (!/\uFFFD/.test(text) && !/ë|ì|í|­|²|ê|·|¬|§|´|¨|³/.test(text)) {
      return text;
    }
    
    // 완성된 단어 패턴 먼저 처리 (우선 순위가 높음)
    let decodedText = text
      .replace(/ë§ì­/g, '만삭')
      .replace(/ì»¨ì/g, '컨셉')
      .replace(/ê·ì¬ì/g, '귀여운')
      .replace(/ê³ë¨/g, '고딕')
      .replace(/íì/g, '팝스')
      .replace(/ììê±°/g, '신생거')
      .replace(/ì²´í¬/g, '체크')
      .replace(/ì¬ì§/g, '사진')
      .replace(/ì¬ì/g, '여성')
      .replace(/êµì¡/g, '교육')
      .replace(/ëª¨ì/g, '모임')
      .replace(/ì°ì/g, '우아');
      
    // 개별 한글 조합 패턴 처리
    const koreanCharMap: Record<string, string> = {
      'ë': '마', 'ì': '아', 'í': '파', 'ì': '시', 'ì': '이', 'ê': '기',
      '­': 'ㅁ', '²': '²', '·': '·', '¬': '¬', '§': '§', '´': '´', '¨': '¨', '³': '³'
    };
    
    // 정규식을 사용해 모든 패턴을 한 번에 대체
    const regex = new RegExp(Object.keys(koreanCharMap).join('|'), 'g');
    decodedText = decodedText.replace(regex, match => koreanCharMap[match] || match);
    
    // 특별한 경우의 부분 문자열 패턴 처리
    const partialPatterns = [
      { from: 'ì²´í¬_ê·ì¬ì', to: '체크_귀여운' },
      { from: 'ë§ì­ì¬ì§', to: '만삭사진' },
      { from: 'ì¬ì ì»¨ì', to: '여신컨셉' }
    ];
    
    for (const pattern of partialPatterns) {
      decodedText = decodedText.replace(new RegExp(pattern.from, 'g'), pattern.to);
    }
    
    // 디코딩된 결과가 원본과 다르면 적용
    if (decodedText !== text) {
      return decodedText;
    }
    
    return text;
  } catch (error) {
    console.error('한글 디코딩 중 오류:', error);
    return text;
  }
}

/**
 * 객체 내의 모든 문자열 필드에 한글 디코딩 적용
 * 
 * 참고: 이 함수는 향상된 decodeKoreanText를 사용하도록 업데이트됨
 * 호환성을 위해 유지하지만, 새 코드에서는 decodeKoreanText를 직접 사용하는 것이 좋음
 * 
 * @param obj 디코딩할 객체
 * @returns 디코딩된 객체
 */
export function decodeKoreanInObject<T>(obj: T): T {
  // 단순 문자열인 경우 바로 처리
  if (typeof obj === 'string') {
    return decodeKoreanText(obj) as unknown as T;
  }
  
  // 객체가 아니거나 null인 경우 원래 값 반환
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  // 배열인 경우 개별 처리
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'object' ? decodeKoreanInObject(item) : 
      typeof item === 'string' ? decodeKoreanText(item) : 
      item
    ) as unknown as T;
  }
  
  // 객체인 경우 복사 후 각 속성 처리
  const result = { ...obj };
  
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const value = result[key];
      
      if (typeof value === 'string') {
        (result as any)[key] = decodeKoreanText(value);
      } else if (Array.isArray(value)) {
        (result as any)[key] = value.map(item => 
          typeof item === 'object' && item !== null ? decodeKoreanInObject(item) : 
          typeof item === 'string' ? decodeKoreanText(item) : 
          item
        );
      } else if (value && typeof value === 'object') {
        (result as any)[key] = decodeKoreanInObject(value);
      }
    }
  }
  
  return result;
}