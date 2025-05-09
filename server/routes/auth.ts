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
      const userValues = {
        username: validatedData.username,
        password: hashedPassword,
        email: validatedData.email || null,
        fullName: validatedData.fullName || null,
        emailVerified: false,
        memberType: validatedData.memberType || "general"
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

      // 토큰 생성
      const user = {
        ...newUser[0],
        roles: ["user"],
      };
      
      const accessToken = generateToken(user);
      const refreshToken = await generateRefreshToken(newUser[0].id);

      // 응답
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14일
      });

      return res.status(201).json({
        user: sanitizeUser(user),
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

// 로그인 API
router.post("/login", (req, res, next) => {
  passport.authenticate("local", async (err: any, user: any, info: any) => {
    try {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info.message || "로그인 실패" });
      }
      
      // JWT 토큰 생성
      const accessToken = generateToken(user);
      const refreshToken = await generateRefreshToken(user.id);
      
      // 쿠키에 리프레시 토큰 저장
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14일
      });
      
      // 응답
      return res.json({
        user: sanitizeUser(user),
        accessToken,
      });
    } catch (error) {
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

// 로그아웃 API
router.post("/logout", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (refreshToken) {
    // 리프레시 토큰 무효화
    invalidateRefreshToken(refreshToken);
  }
  
  // 쿠키 삭제
  res.clearCookie("refreshToken");
  
  return res.json({ message: "로그아웃 성공" });
});

// 현재 로그인한 사용자 정보 조회 API
router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const userId = (req.user as any).sub;
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }
    
    return res.json(sanitizeUser(user));
  } catch (error) {
    console.error("사용자 정보 조회 오류:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// 관리자 역할 확인 API (예시)
router.get("/admin-check", authenticateJWT, checkRole(["admin", "superadmin"]), (req, res) => {
  return res.json({ isAdmin: true });
});

export default router;