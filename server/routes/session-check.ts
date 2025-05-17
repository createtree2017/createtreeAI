/**
 * 세션 체크 전용 라우터 - 모바일 로그인 문제 해결을 위한 추가 엔드포인트
 */
import { Router } from 'express';

const router = Router();

// 세션 체크 API - 모바일 인증을 위한 전용 엔드포인트
router.get('/', (req, res) => {
  console.log("===================================================");
  console.log("[세션 체크 API]");
  console.log("- 세션 ID:", req.sessionID);
  console.log("- 인증 상태:", req.isAuthenticated?.() || false);
  
  if (req.session) {
    // 조심: firebaseUid가 없을 수 있으므로 안전하게 처리
    const firebasePrefix = req.session.firebaseUid 
      ? `${req.session.firebaseUid.substring(0, 5)}...` 
      : "없음";
      
    console.log("- 세션 데이터:", {
      userId: req.session.userId || "없음",
      firebaseUid: firebasePrefix,
      userRole: req.session.userRole || "없음",
      isAdmin: req.session.isAdmin || false,
      passport: req.session.passport ? "설정됨" : "없음"
    });
  }
  console.log("===================================================");

  // 인증되었을 경우 사용자 정보 반환
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ 
      authenticated: true,
      session: {
        id: req.sessionID,
        active: true
      },
      user: {
        id: req.session.userId,
        role: req.session.userRole,
        // passport ID도 포함
        passport_id: req.session.passport?.user
      }
    });
  }
  
  // 세션은 있지만 인증되지 않은 경우
  if (req.session && req.session.userId) {
    return res.json({
      authenticated: false,
      session: {
        id: req.sessionID,
        active: true,
        incomplete: true
      },
      message: "세션은 존재하지만 완전히 인증되지 않았습니다."
    });
  }
  
  // 세션도 없고 인증도 안된 경우
  return res.status(401).json({ 
    authenticated: false,
    session: {
      active: false
    },
    message: "인증 세션이 존재하지 않습니다." 
  });
});

// 세션 상태 강제 변경 (개발 및 디버깅용)
router.post('/fix-session', (req, res) => {
  if (!req.session) {
    return res.status(500).json({
      error: "세션이 초기화되지 않았습니다."
    });
  }
  
  try {
    const { userId, firebaseUid, userRole, isAdmin } = req.body;
    
    if (userId) {
      req.session.userId = userId;
      // passport 세션 데이터도 동기화
      req.session.passport = { user: userId };
    }
    
    if (firebaseUid) {
      req.session.firebaseUid = firebaseUid;
    }
    
    if (userRole) {
      req.session.userRole = userRole;
    }
    
    if (isAdmin !== undefined) {
      req.session.isAdmin = isAdmin === true;
    }
    
    // 세션 저장
    req.session.save((err) => {
      if (err) {
        console.error("세션 저장 오류:", err);
        return res.status(500).json({
          error: "세션 저장 중 오류가 발생했습니다.",
          details: err.message
        });
      }
      
      return res.json({
        success: true,
        message: "세션 정보가 업데이트되었습니다.",
        session: {
          id: req.sessionID,
          userId: req.session.userId,
          firebaseUid: req.session.firebaseUid,
          userRole: req.session.userRole,
          isAdmin: req.session.isAdmin,
          hasPassport: !!req.session.passport
        }
      });
    });
  } catch (error) {
    console.error("세션 수정 오류:", error);
    return res.status(500).json({
      error: "세션 정보 수정 중 오류가 발생했습니다.",
      message: error instanceof Error ? error.message : "알 수 없는 오류"
    });
  }
});

export default router;