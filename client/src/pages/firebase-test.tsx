import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from "firebase/auth";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const FirebaseTestPage: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [testLog, setTestLog] = useState<string[]>([]);

  // Firebase 구성 객체 - 스크린샷에서 확인한 정확한 값으로 설정
  const firebaseConfig = {
    apiKey: "AIzaSyCINDZ1I6iqCNkxLG73GEOFwOrPm52uxM",
    authDomain: "createai-7facc.firebaseapp.com", 
    projectId: "createai-7facc",
    storageBucket: "createai-7facc.appspot.com",
    messagingSenderId: "980137173202",
    appId: "1:980137173202:web:aef6cd9e1b3914ad7ac997",
    measurementId: "G-2MZ24X4RDX"
  };

  // 로그 추가 함수
  const log = (message: string) => {
    setTestLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // 페이지 로드 시 Firebase 초기화 시도 
  useEffect(() => {
    log("Firebase 테스트 페이지 로드됨");
    log(`현재 도메인: ${window.location.origin}`);
    
    // Firebase 초기화 시도
    try {
      setStatus('loading');
      log("Firebase 초기화 시작...");
      
      const app = initializeApp(firebaseConfig);
      setFirebaseApp(app);
      log("Firebase 앱 초기화 성공!");
      
      const authInstance = getAuth(app);
      setAuth(authInstance);
      log("Firebase Auth 서비스 초기화 성공!");
      
      setStatus('success');
      setMessage("Firebase가 성공적으로 초기화되었습니다!");
    } catch (err: any) {
      setStatus('error');
      setError(err.message || "Firebase 초기화 실패");
      log(`Firebase 초기화 실패: ${err.message}`);
    }
  }, []);

  // Google 로그인 테스트
  const testGoogleSignIn = async () => {
    if (!auth) {
      log("Auth 서비스가 초기화되지 않았습니다");
      return;
    }
    
    log("Google 로그인 시도...");
    setStatus('loading');
    
    try {
      const provider = new GoogleAuthProvider();
      log("Google 제공자 초기화 성공");
      
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      
      log("Google 팝업 시작...");
      const result = await signInWithPopup(auth, provider);
      log("Google 로그인 성공!");
      
      // Google 계정 정보 확인
      const user = result.user;
      log(`사용자 정보: ${user.displayName} (${user.email})`);
      
      setStatus('success');
      setMessage(`${user.displayName || user.email}님으로 로그인 성공!`);
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
      log(`Google 로그인 오류: ${err.message}`);
      
      // Firebase 인증 에러 처리
      if (err.code) {
        log(`오류 코드: ${err.code}`);
        switch(err.code) {
          case 'auth/popup-closed-by-user':
            setError("로그인 창이 사용자에 의해 닫혔습니다.");
            break;
          case 'auth/cancelled-popup-request':
            setError("다중 팝업 요청이 취소되었습니다.");
            break;
          case 'auth/popup-blocked':
            setError("팝업이 브라우저에 의해 차단되었습니다. 팝업 차단을 해제해주세요.");
            break;
          case 'auth/api-key-not-valid':
          case 'auth/invalid-api-key':
            setError("Firebase API 키가 유효하지 않습니다. Firebase 설정을 확인해주세요.");
            break;
          case 'auth/unauthorized-domain':
          case 'auth/domain-not-authorized':
            setError(`현재 도메인(${window.location.origin})이 Firebase에 등록되지 않았습니다. Firebase 콘솔에서 승인된 도메인 목록에 추가해주세요.`);
            break;
        }
      }
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-center mb-8">Firebase 설정 테스트</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Firebase 설정 정보</CardTitle>
            <CardDescription>
              현재 사용 중인 Firebase 구성 정보입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-semibold">API 키:</p>
                <code className="text-sm bg-gray-100 p-1 rounded">
                  {firebaseConfig.apiKey.substring(0, 6)}...
                </code>
              </div>
              <div>
                <p className="font-semibold">프로젝트 ID:</p>
                <code className="text-sm bg-gray-100 p-1 rounded">
                  {firebaseConfig.projectId}
                </code>
              </div>
              <div>
                <p className="font-semibold">Auth 도메인:</p>
                <code className="text-sm bg-gray-100 p-1 rounded">
                  {firebaseConfig.authDomain}
                </code>
              </div>
              <div>
                <p className="font-semibold">현재 도메인:</p>
                <code className="text-sm bg-gray-100 p-1 rounded">
                  {window.location.origin}
                </code>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full">
              {status === 'success' && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle>성공</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
              
              {status === 'error' && (
                <Alert className="bg-red-50 text-red-800 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle>오류</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {status === 'loading' && (
                <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle>로딩 중</AlertTitle>
                  <AlertDescription>
                    Firebase 서비스에 연결 중입니다...
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Authentication 테스트</CardTitle>
            <CardDescription>
              Firebase 인증 기능을 테스트합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={testGoogleSignIn} 
                disabled={!auth || status === 'loading'}
                className="w-full"
              >
                {status === 'loading' ? "로딩 중..." : "Google 로그인 테스트"}
              </Button>
              
              <div className="mt-4">
                <p className="font-semibold mb-2">로그:</p>
                <div className="bg-gray-100 p-2 rounded h-64 overflow-y-auto text-xs">
                  {testLog.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FirebaseTestPage;