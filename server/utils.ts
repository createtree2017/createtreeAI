/**
 * 서버 유틸리티 함수 모음
 */

/**
 * 한글 인코딩 문제를 해결하기 위한 디코딩 함수
 * @param text 디코딩할 텍스트
 * @returns 디코딩된 텍스트
 */
export function decodeKoreanText(text: string): string {
  if (!text) return '';
  
  try {
    // 이미 디코딩된 텍스트인지 확인
    if (!/\uFFFD/.test(text) && !/ë|ì|­|ì|ê/.test(text)) {
      return text;
    }
    
    // 일반적인 한글 깨짐 패턴 수정 - 더 많은 패턴 추가
    let decodedText = text
      .replace(/ë§ì­/g, '만삭')
      .replace(/ì»¨ì/g, '컨셉')
      .replace(/ê·ì¬ì/g, '귀여운')
      .replace(/ê³ë¨/g, '고딕')
      .replace(/íì/g, '팝스')
      .replace(/ììê±°/g, '신생거');
      
    // 추가 패턴들 (로그에서 확인된 패턴)
    decodedText = decodedText
      .replace(/ë/g, '마')
      .replace(/ì/g, '시')
      .replace(/­/g, 'ㅁ')
      .replace(/ì/g, '이')
      .replace(/ê/g, '기');
      
    // 특별한 경우에 대한 추가 처리
    if (decodedText !== text) {
      // 로그 출력은 개발 모드에서만 필요하므로 주석 처리
      // console.log(`인코딩 수정됨: "${text}" => "${decodedText}"`);
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