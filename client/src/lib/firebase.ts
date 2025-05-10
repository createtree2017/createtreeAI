import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/**
 * Firebase 설정
 * 스크린샷에서 직접 확인한 Firebase 구성 정보를 사용합니다.
 */

// Firebase 구성 객체 - 스크린샷에서 확인한 정확한 값으로 설정
const firebaseConfig = {
  apiKey: "AIzaSyCINDZ1I6iqCNkxLG73GEOFwOrPm52uxM",
  authDomain: "createai-7facc.firebaseapp.com", 
  projectId: "createai-7facc",
  storageBucket: "createai-7facc.firebasestorage.app",
  messagingSenderId: "980137173202",
  appId: "1:980137173202:web:aef6cd9e1b3914ad7ac997",
  measurementId: "G-2MZ24X4RDX"
};

// Firebase 초기화 및 서비스 설정
console.log("Firebase 구성 정보:", {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 6) + '...' : '없음'
});

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
console.log("Firebase 앱 초기화 성공");

// Firebase 인증 서비스 초기화
const auth = getAuth(app);
auth.languageCode = 'ko'; // 한국어 설정
console.log("Firebase Auth 서비스 초기화 성공");

// Google 로그인 프로바이더 설정
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});
console.log("Google 로그인 프로바이더 초기화 성공");

// Firebase 서비스 내보내기
export { app, auth, googleProvider };
export default app;