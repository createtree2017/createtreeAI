import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Firebase 환경 변수 테스트 페이지
 * 환경 변수가 제대로 로드되고 있는지 확인하기 위한 디버깅 페이지입니다.
 */
export default function TestFirebase() {
  const [envVars, setEnvVars] = useState<any>({
    loading: true,
    vars: {}
  });

  useEffect(() => {
    // 환경 변수 확인
    const firebaseVars = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "설정되지 않음",
      apiKeyLength: import.meta.env.VITE_FIREBASE_API_KEY ? 
        import.meta.env.VITE_FIREBASE_API_KEY.length : 0,
      apiKeyPrefix: import.meta.env.VITE_FIREBASE_API_KEY ? 
        import.meta.env.VITE_FIREBASE_API_KEY.substring(0, 6) : "N/A",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "설정되지 않음",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "설정되지 않음",
    };

    setEnvVars({
      loading: false,
      vars: firebaseVars
    });

    // 콘솔에 환경 변수 상태 로깅
    console.log("Firebase 환경 변수 테스트 페이지:", firebaseVars);
  }, []);

  // API 키가 유효한지 확인
  const isValidKey = (key: string) => {
    if (!key || key === "설정되지 않음") return false;
    return key.startsWith("AIzaSy");
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Firebase 환경 변수 테스트</CardTitle>
        </CardHeader>
        <CardContent>
          {envVars.loading ? (
            <p>로딩 중...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">API 키 상태</h3>
                <p className="text-sm text-muted-foreground">
                  API 키: {isValidKey(envVars.vars.apiKey) ? 
                    `유효함 (${envVars.vars.apiKeyPrefix}...)` : 
                    "유효하지 않음"}
                </p>
                <p className="text-sm text-muted-foreground">
                  길이: {envVars.vars.apiKeyLength}
                </p>
                <div className="mt-2">
                  <strong>상태:</strong>{" "}
                  {isValidKey(envVars.vars.apiKey) ? (
                    <span className="text-green-500">정상</span>
                  ) : (
                    <span className="text-red-500">오류 - API 키가 유효하지 않습니다</span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium">Project ID</h3>
                <p className="text-sm text-muted-foreground">
                  {envVars.vars.projectId}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">App ID</h3>
                <p className="text-sm text-muted-foreground">
                  {envVars.vars.appId}
                </p>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => {
                    alert(JSON.stringify({
                      VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
                      VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                      VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID
                    }, null, 2));
                  }}
                >
                  환경 변수 값 보기
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}