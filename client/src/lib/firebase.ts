import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth, AuthProvider } from "firebase/auth";
import { FirebaseApp } from "firebase/app";

/**
 * Firebase 설정
 * 
 * 애플리케이션에서 Firebase 서비스를 사용하기 위한 설정 파일입니다.
 * 환경 변수와 하드코딩된 Firebase 프로젝트 정보를 사용합니다.
 */

// Firebase 구성 객체 (환경 변수와 하드코딩된 값 혼합)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCINDZ1I6iqCNkxLG73GEOFfwOrPm52uxM",
  authDomain: "createai-7facc.firebaseapp.com", 
  projectId: "createai-7facc",
  storageBucket: "createai-7facc.firebasestorage.app",
  messagingSenderId: "980137173202",
  appId: "1:980137173202:web:aef6cd9e1b3914ad7ac997",
  measurementId: "G-2MZ24X4RDX"
};

console.log("Firebase 구성:", { ...firebaseConfig, apiKey: "사용 중" });

// Firebase 초기화 - 오류 처리 추가
let app: FirebaseApp;
let auth: Auth;
let googleProvider: GoogleAuthProvider;

try {
  // Firebase 초기화
  app = initializeApp(firebaseConfig);
  
  // Firebase 인증 서비스
  auth = getAuth(app);
  
  // Google 로그인 프로바이더
  googleProvider = new GoogleAuthProvider();
  
  // 로그인 성공 시 접근 권한, 이메일, 프로필 정보 요청 설정
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
  
  // 언어 설정 (한국어)
  auth.languageCode = 'ko';
  
  console.log("Firebase 초기화 성공");
} catch (error) {
  console.error("Firebase 초기화 오류:", error);
  
  // 임시 대체 객체 생성 (오류 방지용)
  app = {} as unknown as FirebaseApp;
  auth = {
    onAuthStateChanged: () => {},
    signOut: async () => {},
    languageCode: 'ko'
  } as unknown as Auth;
  googleProvider = {
    setCustomParameters: () => {}
  } as unknown as GoogleAuthProvider;
}

export { app, auth, googleProvider };
export default app;