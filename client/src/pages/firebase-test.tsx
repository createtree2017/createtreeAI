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
// 환경변수 디버깅을 위한 로그
console.log("🔥 환경변수 확인:", {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID
});

// Firebase 앱 초기화 로직 - 직접 구성
export default function FirebaseTestPage() {
  // 환경변수에서 설정 불러오기
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCINDZ1I6iqCNkxLG73GEOFwOrPm52uxMQ", // 환경변수에 설정된 API 키 사용
    authDomain: "createai-7facc.firebaseapp.com",
    projectId: "createai-7facc",
    storageBucket: "createai-7facc.appspot.com",
    messagingSenderId: "980137173202",
    appId: "1:980137173202:web:aef6cd9e1b3914ad7ac997",
    measurementId: "G-2MZ24X4RDX"
  });
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [app, setApp] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [initStatus, setInitStatus] = useState({
    app: false,
    auth: false,
    provider: false
  });

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
  
  // Firebase 초기화
  useEffect(() => {
    try {
      log("Firebase 초기화 시작...");
      log(`현재 도메인: ${window.location.origin}`);
      
      // 앱 초기화
      const appInstance = initializeApp(firebaseConfig);
      setApp(appInstance);
      setInitStatus(prev => ({ ...prev, app: true }));
      log("✅ Firebase 앱 초기화 성공");
      
      // 인증 서비스 초기화
      const authInstance = getAuth(appInstance);
      setAuth(authInstance);
      setInitStatus(prev => ({ ...prev, auth: true }));
      log("✅ Firebase 인증 서비스 초기화 성공");
      
      // Google 로그인 제공업체 초기화
      const providerInstance = new GoogleAuthProvider();
      providerInstance.setCustomParameters({
        prompt: 'select_account'
      });
      setProvider(providerInstance);
      setInitStatus(prev => ({ ...prev, provider: true }));
      log("✅ Google 로그인 제공업체 초기화 성공");
      
      // 인증 상태 감시
      const unsubscribe = authInstance.onAuthStateChanged((authUser) => {
        if (authUser) {
          log(`이미 로그인된 사용자 감지: ${authUser.displayName}`);
          setUser(authUser);
        } else {
          log("로그인된 사용자 없음");
        }
      });
      
      return () => unsubscribe();
      
    } catch (error: any) {
      log(`❌ Firebase 초기화 오류: ${error.message}`);
      console.error("Firebase 초기화 오류:", error);
      setError(`Firebase 초기화 실패: ${error.message}`);
    }
  }, [firebaseConfig]);

  // Firebase 로그인 함수
  const handleGoogleLogin = async () => {
    if (!auth || !provider || !initStatus.app || !initStatus.auth || !initStatus.provider) {
      setError("Firebase가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    
    resetState();
    setLoading(true);
    
    try {
      log('Google 로그인 시작...');
      log(`현재 도메인: ${window.location.origin}`);
      
      // 팝업 로그인 시도
      log('Google 로그인 팝업 시도...');
      
      // 도메인 확인 먼저 수행
      const currentDomain = window.location.hostname;
      log(`도메인 확인: ${currentDomain}`);
      
      // 개발 도메인인지 확인
      if (currentDomain.includes('replit.dev')) {
        const warningMsg = `
          ⚠️ 개발 도메인(${currentDomain})에서 테스트 중입니다.
          이 도메인이 Firebase 콘솔에 등록되어 있지 않으면 인증이 실패합니다.
          Firebase 콘솔 > Authentication > Settings > Authorized domains에
          "${window.location.hostname}"를 추가해 주세요.
        `;
        log(warningMsg);
      }
      
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
        log(`⛔ 현재 도메인 '${window.location.origin}'이 Firebase에 등록되지 않았습니다.`);
        setError(`이 도메인(${window.location.hostname})이 Firebase 콘솔에 등록되어 있지 않습니다. 
                Firebase 콘솔 > Authentication > Settings > Authorized domains에 
                "${window.location.hostname}"를 추가한 후 다시 시도해 주세요.`);
        return;
      }
      
      if (error.code === 'auth/invalid-api-key') {
        log('Firebase API 키가 유효하지 않습니다.');
      }
      
      setError(error.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
              <div className="flex justify-between">
                <span className="font-medium">초기화 상태:</span>
                <div className="flex gap-2">
                  <Badge variant={initStatus.app ? "default" : "destructive"}>앱</Badge>
                  <Badge variant={initStatus.auth ? "default" : "destructive"}>인증</Badge>
                  <Badge variant={initStatus.provider ? "default" : "destructive"}>공급자</Badge>
                </div>
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
            {window.location.hostname.includes('replit.dev') && (
              <Alert className="mb-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/30">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertTitle>도메인 확인 필요</AlertTitle>
                <AlertDescription className="text-xs">
                  현재 개발 도메인(<code className="text-xs bg-yellow-100 dark:bg-yellow-900/30 px-1 py-0.5 rounded">{window.location.hostname}</code>)에서 테스트 중입니다.
                  Firebase Authentication에서 이 도메인을 인증된 도메인 목록에 추가해야 합니다.
                </AlertDescription>
                <div className="mt-2 text-xs text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Firebase 콘솔로 이동</li>
                    <li>Authentication &gt; Settings &gt; Authorized domains</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">{window.location.hostname}</code> 도메인 추가</li>
                  </ol>
                </div>
              </Alert>
            )}
            
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
              <div className="flex flex-col items-center gap-4">
                <Button 
                  onClick={handleGoogleLogin} 
                  disabled={loading || !initStatus.app || !initStatus.auth || !initStatus.provider}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <LogIn size={16} />
                  )}
                  Google로 로그인
                </Button>
                
                <div className="text-xs text-muted-foreground text-center max-w-md">
                  테스트 서버에서는 Firebase가 도메인 검증을 하기 때문에, 
                  <br />개발 도메인({window.location.hostname})이 Firebase에 등록되어 있지 않으면 
                  <br />로그인이 실패할 수 있습니다.
                </div>
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
                  if (auth) {
                    auth.signOut();
                    setUser(null);
                    log('로그아웃 완료');
                  }
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