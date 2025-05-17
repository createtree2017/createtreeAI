/**
 * JWT 토큰 기반 인증 라우터
 * 모바일 환경에서 세션 쿠키 대신 JWT 토큰을 사용하여 인증 처리
 */
import { Router } from 'express';
import { db } from "@db";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-jwt-tokens-mobile-auth';
const TOKEN_EXPIRY = '24h'; // 토큰 만료 시간 (24시간)

// JWT 토큰 발급 API
router.post('/issue-token', async (req, res) => {
  try {
    // 기존 세션 인증 상태 확인
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: "로그인이 필요합니다."
      });
    }
    
    // 세션에서 사용자 ID 가져오기
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "유효한 사용자 세션이 없습니다."
      });
    }
    
    // 데이터베이스에서 사용자 정보 조회
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자 정보를 찾을 수 없습니다."
      });
    }
    
    // JWT 토큰 생성을 위한 페이로드
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.memberType || 'general'
    };
    
    // JWT 토큰 생성
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    
    // 토큰 응답
    return res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.memberType
      }
    });
  } catch (error) {
    console.error("JWT 토큰 발급 오류:", error);
    return res.status(500).json({
      success: false,
      message: "토큰 발급 중 오류가 발생했습니다.",
      error: error instanceof Error ? error.message : "알 수 없는 오류"
    });
  }
});

// JWT 토큰 검증 API
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "토큰이 제공되지 않았습니다."
      });
    }
    
    // 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 검증 성공
    return res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "유효하지 않은 토큰입니다."
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: "토큰이 만료되었습니다."
      });
    }
    
    console.error("JWT 토큰 검증 오류:", error);
    return res.status(500).json({
      success: false,
      message: "토큰 검증 중 오류가 발생했습니다."
    });
  }
});

// 모바일 전용 로그인 API (Firebase 인증 정보로 직접 JWT 토큰 발급)
router.post('/mobile-login', async (req, res) => {
  try {
    const { firebaseUid, email } = req.body;
    
    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        message: "Firebase UID가 제공되지 않았습니다."
      });
    }
    
    // Firebase UID로 사용자 검색
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, firebaseUid)
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "해당 Firebase UID로 등록된 사용자가 없습니다."
      });
    }
    
    // JWT 토큰 생성을 위한 페이로드
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.memberType || 'general'
    };
    
    // JWT 토큰 생성
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    
    // 토큰 응답
    return res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.memberType
      }
    });
  } catch (error) {
    console.error("모바일 로그인 오류:", error);
    return res.status(500).json({
      success: false,
      message: "모바일 로그인 중 오류가 발생했습니다.",
      error: error instanceof Error ? error.message : "알 수 없는 오류"
    });
  }
});

export default router;