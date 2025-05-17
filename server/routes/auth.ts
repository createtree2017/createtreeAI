import { Router, Request, Response } from "express";
import passport from "passport";
import { db } from "../../db";
import { 
  users, 
  roles, 
  userRoles, 
  insertUserSchema, 
  insertRoleSchema, 
  insertUserRoleSchema 
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { 
  hashPassword, 
  sanitizeUser, 
  generateToken, 
  generateRefreshToken,
  refreshAccessToken,
  invalidateRefreshToken,
  authenticateJWT,
  checkRole
} from "../services/auth";
import { FirebaseUserData, handleFirebaseAuth } from "../services/firebase-auth";

const router = Router();

// 회원 가입 API
router.post("/register", async (req, res) => {
  try {
    // 입력 데이터 유효성 검사
    const validatedData = insertUserSchema.parse(req.body);

    // 사용자명 중복 검사
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, validatedData.username),
    });

    if (existingUser) {
      return res.status(400).json({ message: "이미 사용 중인 사용자명입니다." });
    }

    // 이메일 중복 검사 (이메일이 있는 경우)
    if (validatedData.email) {
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, validatedData.email),
      });

      if (existingEmail) {
        return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
      }
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(validatedData.password);

    try {
      // 사용자 생성 - createdAt과 updatedAt을 SQL 레벨에서 DEFAULT(current_timestamp)로 처리
      console.log("회원가입 요청 데이터:", validatedData); // 로깅 추가
      
      // name 필드가 있으면 fullName에 매핑, 아니면 fullName 사용
      const userValues = {
        username: validatedData.username,
        password: hashedPassword,
        email: validatedData.email || null,
        fullName: validatedData.name || validatedData.fullName || null, // name 필드 우선 사용
        emailVerified: false,
        memberType: validatedData.memberType || "general",
        hospitalId: validatedData.hospitalId || null, // 병원 ID 추가
        // 추가 필드
        promoCode: null
      };

      // 사용자 생성
      const newUser = await db
        .insert(users)
        .values(userValues)
        .returning();

      if (!newUser || newUser.length === 0) {
        return res.status(500).json({ message: "사용자 생성에 실패했습니다." });
      }

      // 기본 역할 (user) 찾기
      const userRole = await db.query.roles.findFirst({
        where: eq(roles.name, "user"),
      });

      // 만약 역할이 존재하지 않는다면 생성
      let roleId = userRole?.id;
      if (!roleId) {
        const newRole = await db
          .insert(roles)
          .values({
            name: "user",
            description: "일반 사용자",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        
        roleId = newRole[0].id;
      }

      // 사용자-역할 매핑 생성
      await db.insert(userRoles).values({
        userId: newUser[0].id,
        roleId: roleId,
        createdAt: new Date(),
      });

      // 회원가입 후 세션에 바로 로그인 될 수 있도록 준비
      const userWithRoles = {
        ...newUser[0],
        roles: ["user"],
      };
      
      const accessToken = generateToken(userWithRoles);
      const refreshToken = await generateRefreshToken(newUser[0].id);

      // 응답
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14일
      });

      return res.status(201).json({
        user: sanitizeUser(userWithRoles),
        accessToken,
      });
    } catch (dbError: any) {
      console.error("DB 저장 오류:", dbError);
      
      // 구체적인 오류 메시지 제공
      if (dbError.code === '23505') {
        return res.status(400).json({ message: "이미 등록된 계정입니다." });
      }
      
      throw dbError; // 다른 오류는 상위 catch 블록으로 전달
    }
  } catch (error: any) {
    console.error("회원가입 오류:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ 
        message: "입력 데이터가 유효하지 않습니다.",
        errors: error.errors 
      });
    }
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// TypeScript에서 Session 타입 확장 (모바일 Firebase 인증 지원)
declare module 'express-session' {
  interface SessionData {
    passport: {
      user: number;
    };
    // Firebase 인증 관련 세션 필드
    userId?: number;
    firebaseUid?: string;
    userEmail?: string;
    userRole?: string;
    isAdmin?: boolean;
    isHospitalAdmin?: boolean;
  }
}

// 로그인 API (세션 기반)
router.post("/login", (req, res, next) => {
  // 로그인 요청 데이터 디버깅
  console.log('로그인 요청 - 사용자명:', req.body.username);
  
  passport.authenticate("local", (err: any, user: any, info: any) => {
    try {
      if (err) {
        console.error('로그인 인증 오류:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('로그인 실패 - 사용자 정보 없음, 이유:', info?.message);
        return res.status(401).json({ message: info?.message || "로그인 실패" });
      }
      
      console.log('인증 성공 - 사용자:', user.username, '(ID:', user.id, ')');
      
      // req.login()을 사용하여 세션에 사용자 저장
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('req.login 호출 오류:', loginErr);
          return next(loginErr);
        }
        
        // 세션 정보 디버깅 로그
        const sessionInfo = {
          id: req.session.id,
          passport: req.session.passport ? JSON.stringify(req.session.passport) : '없음',
          cookie: req.session.cookie ? {
            originalMaxAge: req.session.cookie.originalMaxAge,
            expires: req.session.cookie.expires,
            secure: req.session.cookie.secure,
            httpOnly: req.session.cookie.httpOnly
          } : '없음'
        };
        
        console.log('로그인 성공, 세션 정보:', sessionInfo);
        console.log('req.isAuthenticated():', req.isAuthenticated());
        console.log('req.sessionID:', req.sessionID);
        
        // 중요: 세션 강제 저장 - 항상 세션 저장 보장
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('세션 저장 오류:', saveErr);
            return next(saveErr);
          }
          
          // 응답 - 사용자 정보만 반환 (토큰 없음)
          console.log('세션 저장 완료, 응답 전송');
          
          // 세션 쿠키 설정 강화
          const isProduction = process.env.NODE_ENV === 'production';
          const isHttps = process.env.PROTOCOL === 'https' || isProduction;
          
          // 명시적으로 세션 쿠키 세팅 추가
          res.cookie('connect.sid', req.sessionID, {
            httpOnly: true,
            secure: isHttps,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
            sameSite: isHttps ? 'none' : 'lax',
            path: '/'
          });
          
          return res.json({
            user: sanitizeUser(user)
          });
        });
      });
    } catch (error) {
      console.error('로그인 처리 중 예외 발생:', error);
      return next(error);
    }
  })(req, res, next);
});

// 토큰 갱신 API
router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ message: "리프레시 토큰이 없습니다." });
  }
  
  try {
    const newAccessToken = await refreshAccessToken(refreshToken);
    
    if (!newAccessToken) {
      // 쿠키 삭제
      res.clearCookie("refreshToken");
      return res.status(401).json({ message: "유효하지 않거나 만료된 토큰입니다." });
    }
    
    return res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("토큰 갱신 오류:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// 로그아웃 API (세션 기반)
router.post("/logout", (req, res) => {
  // 디버깅 정보 출력
  console.log('로그아웃 요청: isAuthenticated=', req.isAuthenticated());
  console.log('세션:', req.session);
  console.log('쿠키:', req.cookies);
  
  // req.logout() 사용하여 세션에서 사용자 정보 제거
  req.logout((err) => {
    if (err) {
      console.error("로그아웃 오류:", err);
      return res.status(500).json({ message: "로그아웃 중 오류가 발생했습니다." });
    }
    
    // 세션 파기
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error("세션 파기 오류:", sessionErr);
      }
      
      // 쿠키 삭제 - Replit 환경에서의 설정을 고려
      const isProduction = process.env.NODE_ENV === 'production';
      const isHttps = process.env.PROTOCOL === 'https' || isProduction;
      
      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        path: '/'
      });
      
      console.log('로그아웃 완료, 쿠키 삭제됨');
      return res.json({ message: "로그아웃 성공" });
    });
  });
});

// 현재 로그인한 사용자 정보 조회 API
router.get("/me", (req, res) => {
  try {
    // 인증 상태 디버깅
    console.log(`
===================================================
[인증 상태 확인]
- 요청 경로: ${req.path}
- 요청 헤더: ${JSON.stringify(req.headers['cookie'] || '(없음)')}
- isAuthenticated 함수 존재 여부: ${!!req.isAuthenticated}
- 인증 상태: ${req.isAuthenticated ? req.isAuthenticated() : 'undefined'}
- 세션 존재 여부: ${!!req.session}
- 세션 ID: ${req.session.id || '(없음)'}
- 세션 쿠키 설정: ${JSON.stringify(req.session.cookie || {})}
- 사용자 정보 존재 여부: ${!!req.user}
- passport 세션 데이터: ${JSON.stringify(req.session.passport || '(없음)')}
===================================================
    `);

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    
    // 이미 인증된 사용자 정보가 req.user에 있음
    console.log(`인증된 사용자 정보: ID=${req.user.id}, 이름=${req.user.username || req.user.email || '알 수 없음'}`);
    return res.json(req.user);
  } catch (error) {
    console.error("사용자 정보 조회 오류:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// 관리자 역할 확인 API (세션 기반)
router.get("/admin-check", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  
  // 사용자의 역할이나 memberType을 확인
  const user = req.user as any;
  const isAdmin = user.memberType === 'admin' || user.memberType === 'superadmin' || 
                 (user.roles && user.roles.some((role: string) => ['admin', 'superadmin'].includes(role)));
  
  if (!isAdmin) {
    return res.status(403).json({ message: "관리자 권한이 필요합니다." });
  }
  
  return res.json({ isAdmin: true });
});

// Firebase 로그인 API - ID 토큰 지원 추가
router.post("/firebase-login", async (req, res) => {
  try {
    // 요청에서 사용자 정보와 ID 토큰 추출
    const { user: firebaseUser, idToken } = req.body;

    // ID 토큰 로깅 (개발 및 디버깅 용도)
    console.log("[Firebase Auth] 로그인 요청 - ID 토큰:", idToken ? `제공됨 (${idToken.length} 자)` : "제공되지 않음");

    // 기본 사용자 정보 검증 
    if (!firebaseUser || !firebaseUser.uid) {
      return res.status(400).json({ message: "유효하지 않은 Firebase 사용자 정보입니다." });
    }

    console.log("[Firebase Auth] 로그인 요청:", { 
      uid: firebaseUser.uid, 
      email: firebaseUser.email || "이메일 없음",
      displayName: firebaseUser.displayName || "이름 없음"
    });

    // Firebase 인증 처리
    const userData: FirebaseUserData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || "",
    };

    // 사용자 조회 또는 생성
    const user = await handleFirebaseAuth(userData);

    if (!user) {
      return res.status(500).json({ message: "사용자 처리 중 오류가 발생했습니다." });
    }

    // 세션에 직접 값 추가 (세션 강화를 위한 중요 정보)
    req.session.userId = user.id;
    req.session.firebaseUid = firebaseUser.uid;
    req.session.userEmail = firebaseUser.email;
    
    // memberType 필드 사용하여 역할 설정 (user.role이 아님)
    const memberType = user.memberType || 'general';
    req.session.userRole = memberType;
    req.session.isAdmin = memberType === 'admin' || memberType === 'superadmin';
    req.session.isHospitalAdmin = memberType === 'hospital_admin';

    // 세션 강제 저장
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("[Firebase Auth] 세션 저장 오류:", err);
          reject(err);
        } else {
          console.log("[Firebase Auth] 세션 저장 성공, 세션 ID:", req.sessionID);
          resolve();
        }
      });
    });

    // 사용자 로그인 처리 (Passport를 통한 로그인)
    req.login(user, async (loginErr) => {
      if (loginErr) {
        console.error("[Firebase Auth] 로그인 오류:", loginErr);
        return res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다." });
      }

      console.log("[Firebase Auth] 로그인 성공:", user.id);
      
      // 세션 쿠키 설정 최적화 - Replit 환경에 맞게 조정
      req.session.cookie.sameSite = 'lax';
      req.session.cookie.secure = false;
      req.session.cookie.path = '/';
      
      // 모바일 인증을 위해 추가 정보 세션에 저장
      // @ts-ignore - 세션 타입 확장
      req.session.firebaseUser = {
        uid: firebaseUser.uid,
        email: user.email || '',
        role: user.memberType || 'user'
      };
      req.session.cookie.httpOnly = true;
      
      // 세션 재생성 - 세션 고정 공격 방지 및 쿠키 새로 발급
      const oldSessionID = req.sessionID;
      req.session.regenerate(async (regenerateErr) => {
        if (regenerateErr) {
          console.error("[Firebase Auth] 세션 재생성 오류:", regenerateErr);
          return res.status(500).json({ message: "세션 처리 중 오류가 발생했습니다." });
        }
        
        // 새 세션에 사용자 정보 다시 설정
        req.session.userId = user.id;
        req.session.firebaseUid = user.firebaseUid;
        req.session.userEmail = user.email;
        
        // 권한 정보 설정 (memberType 사용)
        const memberType = user.memberType || 'general';
        req.session.userRole = memberType;
        req.session.isAdmin = memberType === 'admin' || memberType === 'superadmin';
        req.session.isHospitalAdmin = memberType === 'hospital_admin';
        
        // passport 인증 정보 설정
        req.session.passport = { user: user.id };
        
        // 세션 저장
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[Firebase Auth] 세션 저장 오류:", saveErr);
            return res.status(500).json({ message: "세션 저장 중 오류가 발생했습니다." });
          }
          
          console.log("[Firebase Auth] 세션 저장 성공! 이전/신규 세션 ID:", oldSessionID, "->", req.sessionID);
          console.log("[Firebase Auth] 세션 및 인증 상태:", {
            isAuthenticated: req.isAuthenticated?.() || false,
            sessionID: req.sessionID,
            sessionCookie: req.session.cookie ? "설정됨" : "없음",
            passport: req.session.passport ? "설정됨" : "없음",
            user: user.id
          });
          
          // 명시적 세션 쿠키 설정 (모바일 환경을 위한 강화)
          const isProduction = process.env.NODE_ENV === 'production';
          const domain = req.get('host')?.split(':')[0] || undefined;
          
          // 쿠키 추가 설정
          res.cookie('auth_status', 'logged_in', {
            httpOnly: false, // 클라이언트에서 접근 가능
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
            path: '/'
          });
          
          // 응답
          return res.status(200).json({
            user: sanitizeUser(user),
            message: "Firebase 로그인 성공",
            sessionId: req.sessionID, // 디버깅 용도로 세션 ID 포함
            auth: {
              success: true,
              memberType
            }
          });
        });
      });
    });
  } catch (error) {
    console.error("[Firebase Auth] 오류:", error);
    return res.status(500).json({ 
      message: "서버 오류가 발생했습니다.",
      error: error instanceof Error ? error.message : "알 수 없는 오류" 
    });
  }
});

export default router;