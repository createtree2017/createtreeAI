import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';

// 로그인 응답 타입
interface LoginResponse {
  success: boolean;
  user?: {
    id: number;
    username: string;
    email?: string;
    memberType?: string;
  };
  message?: string;
}

export default function TestLoginPage() {
  const [user, setUser] = useState<LoginResponse['user'] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // 테스트 로그인 실행
  const handleTestLogin = async () => {
    try {
      setLoading(true);
      console.log('테스트 로그인 시도...');
      
      // POST 요청 바로 실행
      const response = await fetch('/api/test-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 쿠키 포함 (중요!)
        body: JSON.stringify({}),
      });
      
      const data = await response.json() as LoginResponse;
      console.log('테스트 로그인 응답:', data);
      
      if (data.success && data.user) {
        setUser(data.user);
        toast({
          title: '테스트 로그인 성공',
          description: `${data.user.username}님으로 로그인되었습니다.`,
        });
      } else {
        toast({
          title: '테스트 로그인 실패',
          description: data.message || '알 수 없는 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('테스트 로그인 오류:', error);
      toast({
        title: '테스트 로그인 오류',
        description: '서버 연결 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setUser(null);
        toast({
          title: '로그아웃 성공',
          description: '성공적으로 로그아웃되었습니다.',
        });
      } else {
        toast({
          title: '로그아웃 실패',
          description: '로그아웃 처리 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
      toast({
        title: '로그아웃 오류',
        description: '서버 연결 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 쿠키 확인 함수
  const checkCookies = () => {
    console.log('현재 쿠키:', document.cookie);
    toast({
      title: '쿠키 확인',
      description: document.cookie ? `현재 쿠키: ${document.cookie}` : '현재 쿠키가 없습니다.',
    });
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8 text-center">간편 테스트 로그인</h1>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>인증 상태 테스트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {user ? (
              <div className="bg-green-50 p-4 rounded-md">
                <p className="font-medium text-green-800">로그인됨</p>
                <p>사용자명: {user.username}</p>
                <p>회원 ID: {user.id}</p>
                {user.memberType && <p>회원유형: {user.memberType}</p>}
                {user.email && <p>이메일: {user.email}</p>}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-md">
                <p>로그인되지 않음</p>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              {!user ? (
                <Button 
                  onClick={handleTestLogin} 
                  disabled={loading}
                >
                  {loading ? '처리 중...' : '테스트 관리자로 로그인'}
                </Button>
              ) : (
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  disabled={loading}
                >
                  로그아웃
                </Button>
              )}
              
              <Button
                onClick={checkCookies}
                variant="secondary"
              >
                쿠키 확인
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}