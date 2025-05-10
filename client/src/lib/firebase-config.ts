// Firebase 설정 파일
// 환경 변수에서 Firebase 설정 정보를 가져옵니다

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "98013717302",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-2M2Z4X4RDX"
};