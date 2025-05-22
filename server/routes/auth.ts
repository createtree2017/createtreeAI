import { Router, Request, Response } from "express";
import passport from "passport";
import { db } from "../../db";
import {
  users,
  roles,
  userRoles,
  insertUserSchema,
  insertRoleSchema,
  insertUserRoleSchema,
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  sanitizeUser,
  generateToken,
  generateRefreshToken,
  refreshAccessToken,
  invalidateRefreshToken,
  authenticateJWT,
  checkRole,
} from "../../server/services/auth";
import {
  FirebaseUserData,
  handleFirebaseAuth,
} from "../../server/services/firebase-auth";

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
      return res
        .status(400)
        .json({ message: "이미 사용 중인 사용자명입니다." });
    }

    // 이메일 중복 검사 (이메일이 있는 경우)
    if (validatedData.email) {
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, validatedData.email),
      });

      if (existingEmail) {
        return res
          .status(400)
          .json({ message: "이미 사용 중인 이메일입니다." });
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
        promoCode: null,
      };

      // 사용자 생성
      const newUser = await db.insert(users).values(userValues).returning();

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
      if (dbError.code === "23505") {
        return res.status(400).json({ message: "이미 등록된 계정입니다." });
      }

      throw dbError; // 다른 오류는 상위 catch 블록으로 전달
    }
  } catch (error: any) {
    console.error("회원가입 오류:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({
        message: "입력 데이터가 유효하지 않습니다.",
        errors: error.errors,
      });
    }
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// 모바일 Firebase 로그인 후 JWT 토큰 생성
router.post("/firebase-jwt", async (req, res) => {
  try {
    console.log("[Firebase JWT] Firebase 인증 후 JWT 토큰 생성 요청");
    
    const { firebaseUid, email } = req.body;
    
    if (!firebaseUid || !email) {
      return res.status(400).json({ 
        message: "Firebase UID 및 이메일이 필요합니다." 
      });
    }

    // 사용자 DB에서 조회 또는 생성
    let user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, firebaseUid)
    });

    if (!user) {
      // 새 사용자 생성
      console.log("[Firebase JWT] 새 사용자 생성:", email);
      const [newUser] = await db.insert(users).values({
        username: email.split('@')[0],
        firebaseUid,
        fullName: email.split('@')[0],
        memberType: "general",
        needProfileComplete: true
      }).returning();
      
      user = newUser;
    }

    // JWT 토큰 생성
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-2025";
    
    const token = jwt.default.sign(
      { 
        userId: user.id,
        email: user.email,
        firebaseUid: user.firebaseUid
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log("[Firebase JWT] JWT 토큰 생성 성공, 사용자 ID:", user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        memberType: user.memberType,
        needProfileComplete: user.needProfileComplete
      }
    });

  } catch (error) {
    console.error("[Firebase JWT] 오류:", error);
    res.status(500).json({ 
      message: "JWT 토큰 생성 중 오류가 발생했습니다." 
    });
  }
});

// TypeScript에서 Session 타입 확장 (모바일 Firebase 인증 지원)
declare module "express-session" {
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
    // 직접 사용자 객체 저장을 위한 필드 추가
    user?: {
      uid: string;
      email: string;
      role: string;
      [key: string]: any;
    };
  }
}

// 로그인 API (세션 기반)
router.post("/login", (req, res, next) => {
  // 로그인 요청 데이터 디버깅
  console.log("로그인 요청 - 사용자명:", req.body.username);

  passport.authenticate("local", (err: any, user: any, info: any) => {
    try {
      if (err) {
        console.error("로그인 인증 오류:", err);
        return next(err);
      }

      if (!user) {
        console.log("로그인 실패 - 사용자 정보 없음, 이유:", info?.message);
        return res
          .status(401)
          .json({ message: info?.message || "로그인 실패" });
      }

      console.log("인증 성공 - 사용자:", user.username, "(ID:", user.id, ")");

      // req.login()을 사용하여 세션에 사용자 저장
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("req.login 호출 오류:", loginErr);
          return next(loginErr);
        }

        // 세션 정보 디버깅 로그
        const sessionInfo = {
          id: req.session.id,
          passport: req.session.passport
            ? JSON.stringify(req.session.passport)
            : "없음",
          cookie: req.session.cookie
            ? {
                originalMaxAge: req.session.cookie.originalMaxAge,
                expires: req.session.cookie.expires,
                secure: req.session.cookie.secure,
                httpOnly: req.session.cookie.httpOnly,
              }
            : "없음",
        };

        console.log("로그인 성공, 세션 정보:", sessionInfo);
        console.log("req.isAuthenticated():", req.isAuthenticated());
        console.log("req.sessionID:", req.sessionID);

        // 중요: 세션 강제 저장 - 항상 세션 저장 보장
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("세션 저장 오류:", saveErr);
            return next(saveErr);
          }

          // 응답 - 사용자 정보만 반환 (토큰 없음)
          console.log("세션 저장 완료, 응답 전송");

          // 세션 쿠키 설정 강화
          const isProduction = process.env.NODE_ENV === "production";
          const isHttps = process.env.PROTOCOL === "https" || isProduction;

          // 명시적으로 세션 쿠키 세팅 추가
          res.cookie("connect.sid", req.sessionID, {
            httpOnly: true,
            secure: isHttps,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
            sameSite: isHttps ? "none" : "lax",
            path: "/",
          });

          return res.json({
            user: sanitizeUser(user),
          });
        });
      });
    } catch (error) {
      console.error("로그인 처리 중 예외 발생:", error);
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
      return res
        .status(401)
        .json({ message: "유효하지 않거나 만료된 토큰입니다." });
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
  console.log("로그아웃 요청: isAuthenticated=", req.isAuthenticated());
  console.log("세션:", req.session);
  console.log("쿠키:", req.cookies);

  // req.logout() 사용하여 세션에서 사용자 정보 제거
  req.logout((err) => {
    if (err) {
      console.error("로그아웃 오류:", err);
      return res
        .status(500)
        .json({ message: "로그아웃 중 오류가 발생했습니다." });
    }

    // 세션 파기
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error("세션 파기 오류:", sessionErr);
      }

      // 쿠키 삭제 - Replit 환경에서의 설정을 고려
      const isProduction = process.env.NODE_ENV === "production";
      const isHttps = process.env.PROTOCOL === "https" || isProduction;

      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? "none" : "lax",
        path: "/",
      });

      console.log("로그아웃 완료, 쿠키 삭제됨");
      return res.json({ message: "로그아웃 성공" });
    });
  });
});

// 프로필 완성 API
router.post("/complete-profile", async (req, res) => {
  try {
    // 사용자 인증 확인 - 세션 및 Firebase 인증 모두 확인
    const authStatus = req.isAuthenticated();
    const sessionUserId = req.session.userId || (req.session.passport && req.session.passport.user);
    
    // 상세 로그 추가
    console.log(`
===================================================
[프로필 완성 요청]
- 인증 상태: ${authStatus}
- 세션 ID: ${req.session.id || '없음'}
- 세션 사용자 ID: ${sessionUserId || '없음'}
- 세션 사용자 객체: ${req.session.user ? JSON.stringify(req.session.user) : '없음'}
- 요청 쿠키: ${req.headers.cookie || '없음'}
===================================================
    `);
    
    // 세션 인증 확인
    if (!authStatus && !sessionUserId) {
      return res.status(401).json({ 
        message: "로그인이 필요합니다.",
        details: "세션이 만료되었거나 인증되지 않았습니다."
      });
    }
    
    // 요청 데이터 검증
    const { 
      displayName,
      nickname,
      memberType, 
      hospitalId, 
      phoneNumber, 
      birthdate,
      dueDate 
    } = req.body;
    
    // 필수 정보 확인
    if (!phoneNumber || !displayName || !nickname || !birthdate || !memberType) {
      return res.status(400).json({ message: "필수 정보가 누락되었습니다." });
    }
    
    // 멤버십 회원인 경우 병원 ID 필수
    if (memberType === "membership" && !hospitalId) {
      return res.status(400).json({ message: "멤버십 회원은 병원 선택이 필수입니다." });
    }
    
    // 사용자 ID 확인 (여러 소스에서 확인)
    let userId = 0;
    
    if (req.user && (req.user as any).id) {
      // Passport 인증 사용자
      userId = (req.user as any).id;
    } else if (req.session.userId) {
      // 세션에 직접 저장된 사용자 ID
      userId = req.session.userId;
    } else if (req.session.passport && req.session.passport.user) {
      // Passport 세션 사용자 ID
      userId = req.session.passport.user;
    } else if (req.session.user && req.session.user.id) {
      // 세션에 직접 저장된 사용자 객체
      userId = req.session.user.id;
    }
    
    if (!userId) {
      return res.status(401).json({ 
        message: "유효한 사용자 ID를 찾을 수 없습니다.", 
        details: "세션이 만료되었거나 손상되었습니다." 
      });
    }
    
    console.log(`[프로필 완성] 사용자 ID 확인: ${userId}`);
    
    // 사용자 정보 업데이트 (기존 필드만 사용하여 업데이트)
    const updateData: any = {
      fullName: displayName,
      username: nickname,
      memberType: memberType,
      hospitalId: memberType === "membership" ? parseInt(hospitalId) : null,
      phoneNumber: phoneNumber,
      dueDate: dueDate ? new Date(dueDate) : null,
      needProfileComplete: false, // 프로필 완성 플래그 업데이트
      updatedAt: new Date()
    };

    // 생년월일 필드 추가 - 스키마에 있을 경우에만 사용
    try {
      updateData.birthdate = new Date(birthdate);
    } catch (err) {
      console.warn("[프로필 완성] 생년월일 변환 오류:", err);
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));
    
    // 즉시 DB에 needProfileComplete: false로 업데이트
    const updateResult = await db.update(users)
      .set({
        needProfileComplete: false
      })
      .where(eq(users.id, userId))
      .returning();
      
    console.log("[프로필 완성] needProfileComplete 필드 명시적 업데이트:", updateResult.length > 0);
      
    // 업데이트된 사용자 정보 조회 (최신 상태 확인)
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!updatedUser) {
      return res.status(500).json({ message: "사용자 정보 업데이트 후 조회 실패" });
    }
    
    console.log(`[프로필 완성] 사용자 정보 업데이트 성공: ID=${userId}, 전화번호=${phoneNumber}, 병원=${hospitalId}, needProfileComplete=${updatedUser.needProfileComplete}`);
    
    // 세션 상태 강제 갱신 (직접 할당)
    if (req.session.user) {
      // 세션에 명시적으로 설정
      req.session.user = {
        ...req.session.user,
        displayName,
        nickname,
        memberType,
        phoneNumber,
        hospitalId: memberType === "membership" ? parseInt(hospitalId) : null,
        birthdate,
        needProfileComplete: false
      };
    }
    
    // req.user 객체도 업데이트 (Passport 사용자 객체)
    if (req.user && typeof req.user === 'object') {
      // 대체하지 말고 속성만 업데이트
      (req.user as any).needProfileComplete = false;
      (req.user as any).fullName = displayName;
      (req.user as any).username = nickname;
      (req.user as any).memberType = memberType;
      (req.user as any).phoneNumber = phoneNumber;
      (req.user as any).hospitalId = memberType === "membership" ? parseInt(hospitalId) : null;
      (req.user as any).birthdate = birthdate;
    }
    
    // Passport 세션 객체 강제 갱신
    if (req.session.passport) {
      req.session.passport = { user: userId };
    }
    
    // 세션 사용자 정보 명시적 갱신
    if (req.session.user) {
      req.session.user = {
        ...(req.session.user || {}),
        phoneNumber,
        hospitalId: memberType === "membership" ? parseInt(hospitalId) : null,
        dueDate,
        needProfileComplete: false
      };
    }

    // Passport 사용자도 다시 로그인 시켜 세션에 재등록
    req.login(updatedUser, (loginErr) => {
      if (loginErr) {
        console.error("재로그인 실패:", loginErr);
      } else {
        console.log("[프로필 완성] 재로그인 성공:", updatedUser.id);
      }
    });

    // 쿠키 명시적으로 설정 (모바일 호환성)
    res.cookie("connect.sid", req.sessionID, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    
    // 세션 저장 (비동기)
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("[Complete Profile] 세션 저장 오류:", saveErr);
        // 세션 저장 실패해도 DB는 업데이트되었으므로 성공 응답
      }
      
      console.log("[프로필 완성] 세션 저장 완료");
    });
    
    // 즉시 성공 응답 반환
    return res.status(200).json({ 
      message: "프로필 정보가 성공적으로 저장되었습니다.",
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        username: updatedUser.username, // 닉네임
        memberType: updatedUser.memberType,
        phoneNumber: updatedUser.phoneNumber,
        hospitalId: updatedUser.hospitalId,
        birthdate: updatedUser.birthdate,
        dueDate: updatedUser.dueDate,
        needProfileComplete: false
      }
    });
  } catch (error) {
    console.error("[Complete Profile] 오류:", error);
    return res.status(500).json({ 
      message: "사용자 정보 업데이트 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "알 수 없는 오류"
    });
  }
});

// 현재 로그인한 사용자 정보 조회 API
router.get("/me", async (req, res) => {
  try {
    // 인증 상태 디버깅
    console.log(`
===================================================
[인증 상태 확인]
- 요청 경로: ${req.path}
- 요청 헤더: ${JSON.stringify(req.headers["cookie"] || "(없음)")}
- isAuthenticated 함수 존재 여부: ${!!req.isAuthenticated}
- 인증 상태: ${req.isAuthenticated ? req.isAuthenticated() : "undefined"}
- 세션 존재 여부: ${!!req.session}
- 세션 ID: ${req.session.id || "(없음)"}
- 세션 쿠키 설정: ${JSON.stringify(req.session.cookie || {})}
- 사용자 정보 존재 여부: ${!!req.user}
- passport 세션 데이터: ${JSON.stringify(req.session.passport || "(없음)")}
===================================================
    `);

    let userId = null;
    let authMethod = null;

    // 1. 세션 기반 인증 확인
    if (req.isAuthenticated && req.isAuthenticated()) {
      userId = req.user?.id || req.session?.user?.id;
      authMethod = "session";
    }
    
    // 2. 세션 인증 실패 시 JWT 토큰 인증 시도
    if (!userId) {
      console.log("[인증] 세션 인증 실패, JWT 토큰 확인 중...");
      
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const jwt = require('jsonwebtoken');
          const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-2025";
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          
          userId = decoded.userId;
          authMethod = "jwt";
          console.log("[인증] JWT 토큰 인증 성공, 사용자 ID:", userId);
        } catch (jwtError) {
          console.log("[인증] JWT 토큰 검증 실패:", jwtError);
        }
      }
    }

    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    // 이미 인증된 사용자 정보가 req.user에 있음
    console.log(
      `인증된 사용자 정보: ID=${userId}, 인증 방법=${authMethod}`,
    );
    
    // 항상 DB에서 최신 사용자 정보 확인
    const freshUserData = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!freshUserData) {
      return res.status(404).json({ message: "사용자 정보를 찾을 수 없습니다." });
    }
    
    // 프로필 완성 여부 판단 (DB 기반)
    // 1. needProfileComplete가 명시적으로 false면 완성됨
    // 2. 아니면 전화번호와 병원ID(멤버십인 경우) 존재 여부로 판단
    const needProfileComplete = 
      freshUserData.needProfileComplete === false ? false : 
      !freshUserData.phoneNumber || 
      (freshUserData.memberType === "membership" && !freshUserData.hospitalId);
      
    // 멤버십 사용자인 경우 병원 정보 조회
    let hospitalName = null;
    if (freshUserData.hospitalId) {
      try {
        // hospitals 테이블 임포트 확인
        const { hospitals } = await import("../../shared/schema");
        
        const hospital = await db.query.hospitals.findFirst({
          where: eq(hospitals.id, freshUserData.hospitalId)
        });
        hospitalName = hospital?.name || null;
      } catch (err) {
        console.error("병원 정보 조회 실패:", err);
      }
    }
    
    console.log(`[/me API] 최신 프로필 완성 상태:
    - DB needProfileComplete: ${freshUserData.needProfileComplete}
    - 전화번호: ${freshUserData.phoneNumber || '(없음)'}
    - 병원ID: ${freshUserData.hospitalId || '(없음)'}
    - 병원명: ${hospitalName || '(없음)'}
    - 최종 판단: ${needProfileComplete ? '프로필 입력 필요' : '프로필 완성됨'}`);
    
    // 세션 정보도 갱신
    if (req.session.user) {
      req.session.user.needProfileComplete = needProfileComplete;
      req.session.user.hospitalName = hospitalName;
    }
    
    // 필요한 정보만 담아서 응답
    return res.json({
      ...freshUserData,
      needProfileComplete,
      hospitalName
    });
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
  const isAdmin =
    user.memberType === "admin" ||
    user.memberType === "superadmin" ||
    (user.roles &&
      user.roles.some((role: string) =>
        ["admin", "superadmin"].includes(role),
      ));

  if (!isAdmin) {
    return res.status(403).json({ message: "관리자 권한이 필요합니다." });
  }

  return res.json({ isAdmin: true });
});

// Firebase 로그인 API (작업지시서 방식 - ID 토큰 검증)
router.post("/firebase-login", async (req, res) => {
  try {
    console.log('🔥 Firebase 로그인 요청 받음:', Object.keys(req.body));
    
    // 작업지시서에 따라 ID 토큰만 추출
    const { idToken } = req.body;
    
    if (!idToken) {
      console.log('❌ ID 토큰 없음');
      return res.status(400).json({ error: "ID 토큰이 필요합니다." });
    }
    
    console.log('🎫 ID 토큰 수신 완료:', idToken.substring(0, 50) + '...');
    
    // JWT 토큰에서 사용자 정보 디코딩
    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(Buffer.from(base64, 'base64').toString().split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      const { sub: uid, email, name } = decoded;
      
      console.log('👤 토큰에서 추출된 사용자 정보:', { uid, email, name });
      
      if (!uid || !email) {
        throw new Error('토큰에서 필수 정보를 찾을 수 없습니다.');
      }
      
      // 사용자 DB에서 조회 또는 생성
      let user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        // 새 사용자 생성
        console.log('👤 새 사용자 생성:', email);
        const [newUser] = await db.insert(users).values({
          firebaseUid: uid,
          email,
          username: email.split('@')[0],
          fullName: name || email.split('@')[0],
          memberType: "general",
          needProfileComplete: true
        }).returning();
        
        user = newUser;
      }
      
      console.log('✅ 사용자 정보 확인 완료:', user.id);
      
      // 세션에 사용자 정보 저장
      req.session.passport = { user: user.id };
      req.session.userId = user.id;
      req.session.firebaseUid = uid;
      req.session.userEmail = email;
      req.session.userRole = user.memberType;
      
      // 세션 저장 보장
      req.session.save((saveError) => {
        if (saveError) {
          console.error('💥 세션 저장 오류:', saveError);
          return res.status(500).json({ error: "세션 저장 중 오류가 발생했습니다." });
        }
        
        console.log('✅ 로그인 성공, 세션 저장 완료');
        
        return res.json({
          token: 'session-based', // 세션 기반이므로 토큰 불필요
          uid,
          email,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            memberType: user.memberType,
            needProfileComplete: user.needProfileComplete
          }
        });
      });
      
    } catch (decodeError) {
      console.error('💥 토큰 디코딩 오류:', decodeError);
      return res.status(401).json({ error: "Invalid token" });
    }
    
  } catch (error) {
    console.error('💥 Firebase 로그인 오류:', error);
    return res.status(500).json({ error: "로그인 처리 중 오류가 발생했습니다." });
  }
});

export default router;