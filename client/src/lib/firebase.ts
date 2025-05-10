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

// API 키 확인
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  throw new Error("❗ Firebase API 키가 설정되지 않았습니다.");
}

// Firebase 구성 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "createai-7facc.firebaseapp.com", 
  projectId: "createai-7facc",
  storageBucket: "createai-7facc.appspot.com",
  messagingSenderId: "980137173202",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-2MZ24X4RDX"
};

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
  prompt: 'select_account'
});

// Firebase 서비스 내보내기
export { app, auth, googleProvider };
export default app;
