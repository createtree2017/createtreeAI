import { Request, Response, NextFunction } from 'express';

// TypeScript에서 Session 타입 확장
declare module 'express-session' {
  interface SessionData {
    passport: {
      user: number;
    };
  }
}

/**
 * 인증 미들웨어 - 로그인한 사용자만 접근 가능
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 요청 쿠키 정보 로깅
  console.log('[인증 미들웨어] 쿠키 헤더:', req.headers.cookie || '(없음)');
  console.log('[인증 미들웨어] 세션 ID:', req.session?.id || '(없음)');
  
  // Passport 설정 확인 - 안전하게 접근
  console.log('[인증 미들웨어] passport 초기화 여부:', !!req.isAuthenticated);
  
  // 세션의 passport 데이터 안전하게 확인
  const hasPassportData = req.session && 'passport' in req.session && req.session.passport;
  console.log('[인증 미들웨어] 세션에 passport 데이터 존재:', !!hasPassportData);
  
  // 인증 상태 검증 (Passport의 isAuthenticated 함수 사용)
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    console.log('[인증 미들웨어] 인증 실패 - 사용자 정보 없음');
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }
  
  // 사용자 정보 존재 확인
  if (!req.user || !req.user.id) {
    console.log('[인증 미들웨어] 인증 실패 - req.user가 없거나 유효하지 않음');
    return res.status(401).json({ message: '세션이 만료되었습니다. 다시 로그인해주세요.' });
  }
  
  // 사용자 정보 로깅
  console.log('[인증 미들웨어] 인증 성공 - 사용자 ID:', req.user.id);
  
  // 다음 미들웨어로 진행
  next();
}