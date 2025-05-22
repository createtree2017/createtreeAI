import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../../db";
import { users, roles, userRoles, refreshTokens } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

// TypeScript에서 Session 타입 확장 (패스포트 타입 오류 수정)
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    passport: {
      user: number;
    };
  }
}

// JWT 설정
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // 실제 환경에서는 환경 변수로 관리
const JWT_EXPIRES_IN = "30m"; // Access 토큰 유효 시간
const REFRESH_TOKEN_EXPIRES_IN = 14 * 24 * 60 * 60 * 1000; // 리프레시 토큰 유효 시간 (14일)

// 비밀번호 해싱 설정
const SALT_ROUNDS = 10;

// 비밀번호 해싱 함수
export async function hashPassword(password: string | null): Promise<string> {
  // null이나 빈 문자열인 경우 임의의 문자열로 해시 (Firebase 인증 등에서 사용)
  if (!password) {
    // Firebase 사용자는 로컬 비밀번호로 로그인할 수 없게 임의의 강력한 해시 생성
    const randomString = randomBytes(32).toString('hex');
    return bcrypt.hash(randomString, SALT_ROUNDS);
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

// 비밀번호 검증 함수
export async function verifyPassword(
  password: string | null,
  hashedPassword: string | null
): Promise<boolean> {
  // 비밀번호나 해시가 없으면 인증 실패
  if (!password || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(password, hashedPassword);
}

// 사용자 정보에서 민감한 정보 제거
export function sanitizeUser(user: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
}

// Passport 초기화 및 설정
export function initPassport() {

  // Serialize user to session - 사용자 ID를 세션에 저장
  passport.serializeUser((user: any, done) => {
    if (!user || typeof user.id === 'undefined') {
      console.error('[serializeUser] 오류: 유효하지 않은 사용자 객체', user);
      return done(new Error('유효하지 않은 사용자 객체'), null);
    }

    // 항상 숫자 타입으로 저장 (일관성 보장)
    const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;

    if (isNaN(userId)) {
      console.error('[serializeUser] 오류: 유효하지 않은 사용자 ID 타입', user.id);
      return done(new Error('유효하지 않은 사용자 ID 형식'), null);
    }

    console.log(`[serializeUser] 세션에 사용자 ID 저장: ${userId} (타입: ${typeof userId})`);
    done(null, userId);
  });

  // Deserialize user from session - 세션에 저장된 ID로 사용자 정보 조회
  passport.deserializeUser(async (id: any, done) => {
    // ID 타입 검증 및 변환
    let userId = id;
    if (typeof id === 'string') {
      userId = parseInt(id, 10);
      if (isNaN(userId)) {
        console.error('[deserializeUser] 오류: 유효하지 않은 ID 문자열:', id);
        return done(new Error('유효하지 않은 사용자 ID 형식'), null);
      }
    }

    console.log(`[deserializeUser] 세션 ID로 사용자 조회 시작: ${userId} (타입: ${typeof userId})`);
    
    // 개발용 테스트 사용자 처리 (ID: 999)
    if (process.env.NODE_ENV !== 'production' && userId === 999) {
      console.log('[deserializeUser] 테스트 관리자 계정 인증 처리');
      return done(null, {
        id: 999,
        username: "테스트관리자",
        password: null,
        email: "test@example.com", 
        fullName: "테스트 관리자",
        emailVerified: true,
        memberType: "superadmin",
        hospitalId: null,
        promoCode: null,
        lastLogin: new Date(),
        firebaseUid: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    try {
      // 실제 사용자 정보 조회
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        console.log(`[deserializeUser] 사용자를 찾을 수 없음: ${userId}`);
        return done(null, null); // null 반환하여 로그인 필요 상태로 설정
      }

      // 민감한 정보 제거 후 사용자 객체 반환
      const sanitizedUser = sanitizeUser(user);
      console.log(`[deserializeUser] 사용자 조회 성공: ${user.username} (ID: ${user.id})`);
      
      // 세션에 사용자 정보 등록
      done(null, sanitizedUser);
    } catch (error) {
      console.error('[deserializeUser] 데이터베이스 조회 오류:', error);
      done(error, null);
    }
  });

  // 로컬 전략 설정 (이메일/비밀번호 인증)
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username", // form에서는 'username' 필드명 유지 (실제로는 이메일)
        passwordField: "password",
      },
      async (username: string, password: string, done: any) => {
        try {
          // username 필드에 이메일이 들어오므로 이메일로 검색
          const user = await db.query.users.findFirst({
            where: eq(users.email, username),
          });

          if (!user) {
            return done(null, false, { message: "잘못된 이메일 주소 또는 비밀번호입니다." });
          }

          // 비밀번호 검증
          const isPasswordValid = await verifyPassword(password, user.password);
          if (!isPasswordValid) {
            return done(null, false, { message: "잘못된 이메일 주소 또는 비밀번호입니다." });
          }

          // 사용자 권한 조회
          const userRolesResult = await db
            .select({
              roleName: roles.name,
            })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, user.id));

          // 사용자 역할 목록 추가
          const userWithRoles = {
            ...user,
            roles: userRolesResult.map((r: { roleName: string }) => r.roleName),
          };

          // 로그인 시간 업데이트
          await db
            .update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id));

          return done(null, userWithRoles);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  return passport;
}

// JWT 토큰 생성
export function generateToken(user: any): string {
  const payload = {
    sub: user.id,
    username: user.username,
    roles: user.roles || [],
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// 리프레시 토큰 생성 및 저장
export async function generateRefreshToken(userId: number): Promise<string> {
  const token = randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

  // DB에 리프레시 토큰 저장
  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

// 리프레시 토큰 검증 및 새 토큰 발급
export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    // 리프레시 토큰 찾기
    const tokenData = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, refreshToken),
    });

    if (!tokenData) {
      return null; // 토큰이 존재하지 않음
    }

    // 토큰 만료 검사
    if (new Date() > tokenData.expiresAt) {
      // 만료된 토큰 삭제
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.id, tokenData.id));
      return null;
    }

    // 사용자 조회
    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenData.userId),
    });

    if (!user) {
      return null;
    }

    // 사용자 권한 조회
    const userRolesResult = await db
      .select({
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    // 새 액세스 토큰 생성
    const userWithRoles = {
      ...user,
      roles: userRolesResult.map((r: { roleName: string }) => r.roleName),
    };

    return generateToken(userWithRoles);
  } catch (error) {
    console.error("리프레시 토큰 오류:", error);
    return null;
  }
}

// 리프레시 토큰 무효화 (로그아웃)
export async function invalidateRefreshToken(token: string): Promise<boolean> {
  try {
    const result = await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.token, token));
    return true;
  } catch (error) {
    console.error("토큰 무효화 오류:", error);
    return false;
  }
}

// JWT 인증 미들웨어
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ success: false, message: "인증 토큰이 없습니다" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "토큰 검증 실패", error: (err as any).message });
  }
}

// 역할 기반 권한 검사 미들웨어
export function checkRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.sendStatus(401);
    }

    const userRoles = (req.user as any).roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.sendStatus(403);
    }

    next();
  };
}