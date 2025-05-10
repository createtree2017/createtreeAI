import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/**
 * Firebase 설정
 * Firebase 콘솔에서 직접 확인한 구성 정보를 사용합니다.
 * 주의: API 키는 민감한 정보이므로 실제 서비스에서는 환경 변수로 관리해야 합니다.
 */

// Firebase 구성 객체 - 스크린샷에서 확인한 정확한 값으로 설정
const firebaseConfig = {
  apiKey: "AIzaSyCINDZ1I6iqCNkxLG73GEOFwOrPm52uxM",
  authDomain: "createai-7facc.firebaseapp.com", 
  projectId: "createai-7facc",
  storageBucket: "createai-7facc.appspot.com", // 수정된 부분: 올바른 형식으로 변경
  messagingSenderId: "980137173202",
  appId: "1:980137173202:web:aef6cd9e1b3914ad7ac997",
  measurementId: "G-2MZ24X4RDX"
};

// Firebase 초기화 및 서비스 설정
console.log("Firebase 초기화 시작");
console.log("Firebase 구성 정보:", {
  apiKey: "설정됨 (민감 정보)",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId.substring(0, 5) + "..." // 민감 정보 부분 가림
});

// 변수 선언
let app;
let auth;
let googleProvider;

try {
  // Firebase 앱 초기화
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase 앱 초기화 성공");

  // Firebase 인증 서비스 초기화
  auth = getAuth(app);
  auth.languageCode = 'ko'; // 한국어 설정
  console.log("✅ Firebase Auth 서비스 초기화 성공");

  // Google 로그인 프로바이더 설정
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
  console.log("✅ Google 로그인 프로바이더 초기화 성공");
} catch (error) {
  console.error("❌ Firebase 초기화 실패:", error);
  
  // 오류 발생 시 기본 객체 생성 (앱 충돌 방지)
  app = {} as any;
  auth = {
    currentUser: null,
    languageCode: 'ko',
    onAuthStateChanged: () => {},
    signOut: async () => {}
  } as any;
  googleProvider = new GoogleAuthProvider();
  
  console.error("❌ Firebase 초기화 실패로 더미 객체 사용 중");
}

// Firebase 서비스 내보내기
export { app, auth, googleProvider };
export default app;