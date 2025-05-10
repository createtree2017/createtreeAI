import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../../db";
import { users, roles, userRoles, refreshTokens } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

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
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        return done(new Error("사용자를 찾을 수 없습니다."), null);
      }

      done(null, sanitizeUser(user));
    } catch (error) {
      done(error, null);
    }
  });

  // 로컬 전략 설정 (username/password 인증)
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username: string, password: string, done: any) => {
        try {
          // 사용자 찾기
          const user = await db.query.users.findFirst({
            where: eq(users.username, username),
          });

          if (!user) {
            return done(null, false, { message: "잘못된 사용자명 또는 비밀번호입니다." });
          }

          // 비밀번호 검증
          const isPasswordValid = await verifyPassword(password, user.password);
          if (!isPasswordValid) {
            return done(null, false, { message: "잘못된 사용자명 또는 비밀번호입니다." });
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
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
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