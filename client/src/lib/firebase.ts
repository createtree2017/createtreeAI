import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// 브라우저 환경 확인 - 디버깅용
console.log("[Firebase Config] 현재 환경:", {
  origin: window.location.origin, 
  hostname: window.location.hostname
});

/**
 * Firebase 설정
 * 
 * Firebase 콘솔에서 직접 확인한 구성 정보를 사용합니다.
 * Firebase 웹 앱 구성 정보는 다음과 같이 정확하게 설정되어야 합니다:
 * - apiKey: Firebase 콘솔에서 제공하는 API 키
 * - authDomain: Firebase 앱의 인증 도메인
 * - projectId: Firebase 프로젝트 ID
 */

// 환경변수 디버깅 로그
console.log("🔥 Firebase 초기화 환경변수:", {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? "설정됨" : "미설정",
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID ? "설정됨" : "미설정",
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID ? "설정됨" : "미설정"
});

// Firebase의 공식 구성 객체 타입과 동일하게 구성
// 환경변수가 있으면 환경변수 사용, 없으면 하드코딩 값 사용
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCINDZ1I6iqCNkxLG73GEOFwOrPm52uxMQ",
  authDomain: "createai-7facc.firebaseapp.com", 
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "createai-7facc",
  storageBucket: "createai-7facc.appspot.com",
  messagingSenderId: "980137173202",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:980137173202:web:aef6cd9e1b3914ad7ac997",
  measurementId: "G-2MZ24X4RDX"
};

console.log("[Firebase] 초기화 시작...");

// Firebase 앱 인스턴스 초기화
let app;
try {
  app = initializeApp(config);
  console.log("[Firebase] 앱 초기화 성공 ✓");
} catch (error) {
  console.error("[Firebase] 앱 초기화 실패 ✗", error);
  throw new Error(`Firebase 초기화 실패: ${error.message}`);
}

// Firebase 인증 서비스 초기화
let auth;
try {
  auth = getAuth(app);
  auth.languageCode = 'ko'; // 한국어 설정
  console.log("[Firebase] 인증 서비스 초기화 성공 ✓");
} catch (error) {
  console.error("[Firebase] 인증 서비스 초기화 실패 ✗", error);
  throw new Error(`Firebase 인증 서비스 초기화 실패: ${error.message}`);
}

// Google 로그인 제공업체 초기화
let googleProvider;
try {
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  console.log("[Firebase] Google 로그인 제공업체 초기화 성공 ✓");
} catch (error) {
  console.error("[Firebase] Google 로그인 제공업체 초기화 실패 ✗", error);
  throw new Error(`Google 로그인 제공업체 초기화 실패: ${error.message}`);
}

// 각 Firebase 서비스 내보내기
export { app, auth, googleProvider };
export default app;