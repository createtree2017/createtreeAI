/**
 * JWT 기반 인증 라우터 (모바일 전용)
 * 세션 쿠키 문제를 해결하기 위한 토큰 기반 인증
 */

import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "@db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// JWT 시크릿 키 (환경변수에서 가져오거나 기본값 사용)
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-2025";

/**
 * 모바일 Google 로그인 처리
 * Firebase UID를 받아서 JWT 토큰 발급
 */
router.post("/mobile-login", async (req: Request, res: Response) => {
  try {
    console.log("[JWT 모바일 로그인] 요청 받음:", req.body);
    
    const { firebaseUid, email, displayName } = req.body;

    if (!firebaseUid || !email) {
      console.log("[JWT 모바일 로그인] 필수 정보 누락:", { firebaseUid, email });
      return res.status(400).json({ 
        error: "Firebase UID와 이메일이 필요합니다" 
      });
    }

    console.log("[JWT 모바일 로그인] Firebase 인증 정보:", {
      firebaseUid,
      email,
      displayName
    });

    // 기존 사용자 조회
    let user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, firebaseUid)
    });

    if (!user) {
      console.log("[JWT 모바일 로그인] 새 사용자 생성");
      
      // 새 사용자 생성
      const [newUser] = await db.insert(users).values({
        firebaseUid,
        email,
        username: displayName || email.split('@')[0],
        fullName: displayName || email.split('@')[0]
      }).returning();

      user = newUser;
      console.log("[JWT 모바일 로그인] 새 사용자 생성 완료:", user.id);
    } else {
      console.log("[JWT 모바일 로그인] 기존 사용자 발견:", user.id);
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        userId: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        memberType: user.memberType || "general"
      },
      JWT_SECRET,
      {
        expiresIn: "30d" // 30일 유효
      }
    );

    console.log("[JWT 모바일 로그인] JWT 토큰 생성 완료");

    // 응답 데이터
    const responseData = {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        memberType: user.memberType,
        firebaseUid: user.firebaseUid
      }
    };

    console.log("[JWT 모바일 로그인] 성공 응답:", {
      userId: user.id,
      email: user.email
    });

    res.json(responseData);

  } catch (error: any) {
    console.error("[JWT 모바일 로그인] 오류:", error);
    res.status(500).json({ 
      error: "모바일 로그인 처리 중 오류가 발생했습니다",
      details: error.message 
    });
  }
});

/**
 * JWT 토큰 검증
 */
router.get("/verify", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "JWT 토큰이 필요합니다" });
    }

    const token = authHeader.substring(7); // "Bearer " 제거
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 사용자 정보 조회
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId)
    });

    if (!user) {
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        memberType: user.memberType,
        firebaseUid: user.firebaseUid
      }
    });

  } catch (error: any) {
    console.error("[JWT 토큰 검증] 오류:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다" });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "토큰이 만료되었습니다" });
    }
    
    res.status(500).json({ error: "토큰 검증 중 오류가 발생했습니다" });
  }
});

/**
 * JWT 토큰 갱신
 */
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "토큰이 필요합니다" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 새 토큰 생성
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        firebaseUid: decoded.firebaseUid,
        email: decoded.email,
        memberType: decoded.memberType
      },
      JWT_SECRET,
      {
        expiresIn: "30d"
      }
    );

    res.json({ token: newToken });

  } catch (error: any) {
    console.error("[JWT 토큰 갱신] 오류:", error);
    res.status(401).json({ error: "토큰 갱신에 실패했습니다" });
  }
});

export default router;