import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '@db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Google OAuth2 설정
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// 현재 Replit 도메인을 사용하는 redirect URI 설정
const REDIRECT_URI = `https://d0d77b78-7584-4870-90de-7e90bf483a1c-00-2fox4esnjilty.kirk.replit.dev/api/google-oauth/callback`;

console.log('🔐 Google OAuth2 설정 확인:', {
  CLIENT_ID: GOOGLE_CLIENT_ID ? '설정됨' : '없음',
  CLIENT_SECRET: GOOGLE_CLIENT_SECRET ? '설정됨' : '없음',
  REDIRECT_URI
});

/**
 * Google OAuth2 로그인 URL 생성
 * GET /api/google-oauth/login
 */
router.get('/login', (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ 
        success: false, 
        message: 'Google OAuth2 클라이언트 ID가 설정되지 않았습니다.' 
      });
    }

    // Google OAuth2 인증 URL 생성 (403 오류 해결을 위한 수정)
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/auth');
    googleAuthUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    googleAuthUrl.searchParams.append('response_type', 'code');
    googleAuthUrl.searchParams.append('scope', 'openid email profile');
    googleAuthUrl.searchParams.append('prompt', 'select_account'); // consent 대신 select_account 사용

    console.log('[Google OAuth] 로그인 URL 생성:', googleAuthUrl.toString());

    // JSON 응답 대신 직접 Google로 리디렉션
    res.redirect(googleAuthUrl.toString());
  } catch (error) {
    console.error('[Google OAuth] 로그인 URL 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 URL 생성에 실패했습니다.'
    });
  }
});

/**
 * Google OAuth2 콜백 처리
 * GET /api/google-oauth/callback?code=...
 */
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      console.error('[Google OAuth] 콜백 - 인증 코드 없음');
      return res.status(400).json({
        success: false,
        message: '인증 코드가 제공되지 않았습니다.'
      });
    }

    console.log('[Google OAuth] 콜백 처리 시작 - 코드:', typeof code === 'string' ? code.substring(0, 20) + '...' : code);

    // 1. Access Token 요청
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Google OAuth] 토큰 요청 실패:', errorText);
      return res.status(400).json({
        success: false,
        message: 'Google 토큰 요청에 실패했습니다.'
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('[Google OAuth] 토큰 요청 성공');

    // 2. 사용자 정보 요청
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('[Google OAuth] 사용자 정보 요청 실패');
      return res.status(400).json({
        success: false,
        message: 'Google 사용자 정보 요청에 실패했습니다.'
      });
    }

    const googleUser = await userResponse.json();
    console.log('[Google OAuth] 사용자 정보 조회 성공:', {
      email: googleUser.email?.substring(0, 3) + '...',
      name: googleUser.name || '이름 없음'
    });

    // 3. 데이터베이스에서 사용자 확인/생성
    let user = await db.query.users.findFirst({
      where: eq(users.email, googleUser.email)
    });

    if (!user) {
      console.log('[Google OAuth] 새 사용자 생성 중...');
      
      // 🎯 스마트 회원등급 자동 설정 시스템
      let memberType = 'general'; // 기본값
      
      // 1. 관리자 이메일 도메인 체크
      const adminDomains = ['createtree.com', 'admin.com'];
      const emailDomain = googleUser.email.split('@')[1];
      
      // 2. 특정 관리자 이메일 리스트
      const superAdminEmails = [
        'ct.createtree@gmail.com',
        'createtree.admin@gmail.com',
        'admin@createtree.com'
      ];
      
      const hospitalAdminEmails = [
        'hospital@gmail.com',
        'admin@hospital.com'
      ];
      
      // 3. 회원등급 자동 결정 로직
      if (superAdminEmails.includes(googleUser.email.toLowerCase())) {
        memberType = 'superadmin';
        console.log('[Google OAuth] 슈퍼관리자 이메일 감지:', googleUser.email);
      } else if (hospitalAdminEmails.includes(googleUser.email.toLowerCase())) {
        memberType = 'hospital_admin';
        console.log('[Google OAuth] 병원관리자 이메일 감지:', googleUser.email);
      } else if (adminDomains.includes(emailDomain)) {
        memberType = 'admin';
        console.log('[Google OAuth] 관리자 도메인 감지:', emailDomain);
      } else {
        console.log('[Google OAuth] 일반회원으로 설정:', googleUser.email);
      }
      
      const [newUser] = await db.insert(users).values({
        username: googleUser.email, // username 필드 사용
        email: googleUser.email,
        fullName: googleUser.name || googleUser.email,
        firebaseUid: googleUser.id, // Google ID를 firebaseUid에 저장
        emailVerified: true,
        memberType: memberType // 🎯 자동 설정된 회원등급 사용
      }).returning();
      
      user = newUser;
      console.log('[Google OAuth] 새 사용자 생성 완료:', `ID: ${user.id}, 등급: ${memberType}`);
    } else {
      console.log('[Google OAuth] 기존 사용자 로그인:', user.id);
      
      // Google ID 업데이트 (필요한 경우)
      if (!user.firebaseUid || user.firebaseUid !== googleUser.id) {
        await db.update(users)
          .set({
            firebaseUid: googleUser.id,
            emailVerified: true
          })
          .where(eq(users.id, user.id));
      }
    }

    // 4. JWT 토큰 생성
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email || '',
        memberType: user.memberType
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 5. 세션 설정
    req.session.userId = user.id;
    req.session.userEmail = user.email || '';
    req.session.userRole = user.memberType || 'general';
    req.session.isAdmin = user.memberType === 'admin';

    console.log('[Google OAuth] 세션 및 JWT 토큰 설정 완료');

    // 6. JWT를 HttpOnly 쿠키로 설정
    res.cookie('auth_token', jwtToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30일
    });

    // 7. 로그인 상태 쿠키 설정 (프론트엔드에서 확인용)
    res.cookie('auth_status', 'logged_in', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    // 8. 성공 후 토큰과 함께 클라이언트 콜백 페이지로 리디렉션
    const redirectUrl = `/?token=${jwtToken}&status=login_success&user_id=${user.id}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('[Google OAuth] 콜백 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 로그아웃
 * POST /api/google-oauth/logout
 */
router.post('/logout', (req, res) => {
  try {
    // 세션 제거
    req.session.destroy((err) => {
      if (err) {
        console.error('[Google OAuth] 세션 제거 오류:', err);
      }
    });

    // 쿠키 제거
    res.clearCookie('auth_token');
    res.clearCookie('auth_status');
    res.clearCookie('createtree.sid');

    console.log('[Google OAuth] 로그아웃 완료');

    res.json({
      success: true,
      message: '로그아웃되었습니다.'
    });
  } catch (error) {
    console.error('[Google OAuth] 로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그아웃 처리 중 오류가 발생했습니다.'
    });
  }
});

export default router;