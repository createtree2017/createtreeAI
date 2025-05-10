// Firebase 초기화 파일
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { firebaseConfig } from "./firebase-config";

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase 인증 및 구글 프로바이더 설정
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 이메일 스코프 요청 - 사용자 프로필 정보 접근용
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
// 사용자 프로필 스코프 요청
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// locale 파라미터 설정 - 한국어 인터페이스 사용
googleProvider.setCustomParameters({
  locale: 'ko'
});

export { auth, googleProvider };