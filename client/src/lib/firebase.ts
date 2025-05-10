/**
 * Firebase 초기화 파일
 * 싱글톤 패턴으로 Firebase 앱을 초기화하고 서비스를 제공합니다.
 */
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/**
 * Firebase 설정 정보 로깅
 */
console.log("Firebase 구성 정보:", {
  환경: window.location.hostname,
  API키설정여부: import.meta.env.VITE_FIREBASE_API_KEY ? "설정됨" : "미설정"
});

// Firebase 구성 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCINDZ1I6iqCNkxLG73GEOFwOrPm52uxMQ",
  authDomain: "createai-7facc.firebaseapp.com", 
  projectId: "createai-7facc",
  storageBucket: "createai-7facc.appspot.com",
  messagingSenderId: "980137173202",
  appId: "1:980137173202:web:aef6cd9e1b3914ad7ac997",
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
