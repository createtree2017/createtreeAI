import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log('[세션 검증] req.session:', req.session);
  console.log('[사용자 정보] req.user:', req.user);
  if (!req.user) return res.status(401).json({ error: '로그인 필요' });
  next();
}