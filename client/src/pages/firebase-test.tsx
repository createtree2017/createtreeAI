import { useEffect, useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, ChevronRight, LogIn } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Firebase 구성 - 하드코딩 (테스트 전용)
const firebaseConfig = {
  apiKey: "AIzaSyCINDZ1I6iqCNkxLG73GEOFwOrPm52uxM",
  authDomain: "createai-7facc.firebaseapp.com",
  projectId: "createai-7facc",
  storageBucket: "createai-7facc.appspot.com",
  messagingSenderId: "980137173202",
  appId: "1:980137173202:web:aef6cd9e1b3914ad7ac997"
};

// Firebase 앱 초기화 로직을 이 파일에 직접 포함 (테스트 전용)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function FirebaseTestPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // 로그 함수
  const log = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // 상태 초기화 함수
  const resetState = () => {
    setUser(null);
    setError(null);
    setLogs([]);
  };

  // Firebase 로그인 함수
  const handleGoogleLogin = async () => {
    resetState();
    setLoading(true);
    
    try {
      log('Google 로그인 시작...');
      log(`현재 도메인: ${window.location.origin}`);
      log('Firebase 초기화 확인 완료');
      
      // 팝업 로그인 시도
      log('Google 로그인 팝업 시도...');
      const result = await signInWithPopup(auth, provider);
      
      log('Google 로그인 성공!');
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const userData = result.user;
      
      // 사용자 정보 기록 (민감 정보 제외)
      log(`로그인 사용자: ${userData.displayName} (${userData.email})`);
      
      // 상태 업데이트
      setUser(userData);
      setError(null);
    } catch (error: any) {
      log(`오류 발생: ${error.code} - ${error.message}`);
      console.error('Google 로그인 오류:', error);
      
      if (error.code === 'auth/unauthorized-domain') {
        log(`현재 도메인 '${window.location.origin}'이 Firebase에 등록되지 않았습니다.`);
      }
      
      if (error.code === 'auth/invalid-api-key') {
        log('Firebase API 키가 유효하지 않습니다.');
      }
      
      setError(error.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Firebase 정보 확인
  useEffect(() => {
    log('Firebase 테스트 페이지 로드됨');
    log(`현재 URL: ${window.location.href}`);
    log(`Firebase 프로젝트: ${firebaseConfig.projectId}`);
    
    // 현재 인증 상태 확인
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        log(`이미 인증된 사용자: ${user.displayName}`);
        setUser(user);
      } else {
        log('인증된 사용자 없음');
      }
    });
    
    return () => unsubscribe();
  }, []);

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-2">Firebase 인증 테스트</h1>
      <p className="text-muted-foreground mb-6">
        이 페이지는 Firebase Google 로그인 기능을 격리된 환경에서 테스트합니다.
      </p>
      
      <div className="grid gap-6">
        {/* 설정 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>Firebase 설정 정보</CardTitle>
            <CardDescription>현재 사용 중인 Firebase 구성 정보</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="font-medium">프로젝트 ID:</span>
                <span>{firebaseConfig.projectId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Auth 도메인:</span>
                <span>{firebaseConfig.authDomain}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">API 키:</span>
                <span>{firebaseConfig.apiKey.substring(0, 10)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">현재 도메인:</span>
                <span>{window.location.origin}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 로그인 테스트 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>Google 로그인 테스트</CardTitle>
            <CardDescription>아래 버튼을 클릭하여 Google 로그인을 테스트하세요</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  {user.photoURL && (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName} 
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">이메일 확인:</span>
                    <Badge className="ml-2" variant={user.emailVerified ? "default" : "outline"}>
                      {user.emailVerified ? "확인됨" : "미확인"}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">UID:</span>
                    <span className="ml-2 text-muted-foreground">{user.uid.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <Button 
                  onClick={handleGoogleLogin} 
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <LogIn size={16} />
                  )}
                  Google로 로그인
                </Button>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>오류 발생</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          {user && (
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  auth.signOut();
                  setUser(null);
                  log('로그아웃 완료');
                }}
              >
                로그아웃
              </Button>
            </CardFooter>
          )}
        </Card>
        
        {/* 로그 카드 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>실행 로그</CardTitle>
              <CardDescription>Firebase 연동 과정 로그</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLogs([])}
            >
              로그 지우기
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-3 rounded-lg text-sm max-h-[300px] overflow-auto">
              {logs.length > 0 ? (
                <div className="grid gap-1.5">
                  {logs.map((log, index) => (
                    <div key={index} className="flex gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-mono">{log}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-6">
                  로그가 없습니다. 로그인을 시도하면 여기에 로그가 표시됩니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}