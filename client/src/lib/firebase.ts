import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/**
 * Firebase 설정
 * 
 * 애플리케이션에서 Firebase 서비스를 사용하기 위한 설정 파일입니다.
 * 환경 변수에서 Firebase 프로젝트 정보를 가져옵니다.
 */

// Firebase 구성 객체
const firebaseConfig = {
  apiKey: "AIzaSyCINDZ1I6iqCNkxLG73GEOFfwOrPm52uxM",
  authDomain: "createai-7facc.firebaseapp.com",
  projectId: "createai-7facc",
  storageBucket: "createai-7facc.firebasestorage.app",
  messagingSenderId: "980137173202",
  appId: "1:980137173202:web:aef6cd9e1b3914ad7ac997",
  measurementId: "G-2MZ24X4RDX"
};

// Firebase 초기화
export const app = initializeApp(firebaseConfig);

// Firebase 인증 서비스 
export const auth = getAuth(app);

// Google 로그인 프로바이더
export const googleProvider = new GoogleAuthProvider();

// 로그인 성공 시 접근 권한, 이메일, 프로필 정보 요청 설정
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// 언어 설정 (한국어)
auth.languageCode = 'ko';

export default app;