/**
 * Firebase 초기화 파일
 * 싱글톤 패턴으로 Firebase 앱을 초기화하고 서비스를 제공합니다.
 */
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/**
 * Firebase 설정 정보 로깅
 */
// 환경변수 디버깅 로그
console.log("🔥 Firebase 초기화 환경변수:", {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY
    ? "설정됨"
    : "미설정",
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID
    ? "설정됨"
    : "미설정",
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID
    ? "설정됨"
    : "미설정",
});

// 필수 환경 변수 확인
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  throw new Error("❗ Firebase API 키가 설정되지 않았습니다.");
}
if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  throw new Error("❗ Firebase 프로젝트 ID가 설정되지 않았습니다.");
}
if (!import.meta.env.VITE_FIREBASE_APP_ID) {
  throw new Error("❗ Firebase 앱 ID가 설정되지 않았습니다.");
}

// Firebase 구성 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // authDomain이 Firebase 콘솔에 등록되어 있는 도메인과 일치해야 합니다
  // 기본값으로 Firebase 프로젝트의 기본 도메인을 사용하되
  // 환경변수로 재정의 가능하도록 설정
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 
              `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "527763789648",
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 실행 환경 확인
console.log("[Firebase 초기화] 현재 도메인:", window.location.hostname);
console.log("[Firebase 초기화] authDomain 설정:", firebaseConfig.authDomain);

// 모바일 환경에서 리디렉션 처리를 위한 설정
// Firebase는 특정 규칙으로 authDomain을 확인하기 때문에 이 설정이 중요합니다
if (window.location.hostname.includes('replit')) {
  console.log("[Firebase 초기화] Replit 환경 감지, 도메인 자동 설정");
  
  // Replit 환경에서는 Firebase의 기본 authDomain을 사용
  // 이렇게 하면 리디렉션 후에도 도메인 미스매치 없이 인증 처리 가능
  firebaseConfig.authDomain = "createtreeai.firebaseapp.com";
}

/**
 * Firebase 앱 초기화 함수
 * 이미 초기화된 앱이 있으면 그것을 사용하고, 없으면 새로 초기화합니다.
 */
function initializeFirebaseApp() {
  if (getApps().length > 0) {
    // 이미 초기화된 앱이 있으면 그것을 반환
    return getApp();
  }
  
  // 새 앱 초기화
  return initializeApp(firebaseConfig);
}

// Firebase 앱 초기화
const app = initializeFirebaseApp();

// Firebase 인증 서비스 초기화
const auth = getAuth(app);
auth.languageCode = 'ko'; // 한국어 설정

// Google 로그인 제공업체 초기화
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  login_hint: '',  // 사용자가 항상 계정을 선택하도록 함
  access_type: 'offline',  // 오프라인 액세스 요청 (리프레시 토큰 발급)
  hl: 'ko'  // UI 언어를 한국어로 설정
});

// Firebase 서비스 내보내기
export { app, auth, googleProvider };
export default app;
