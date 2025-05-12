import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

interface User {
  id: number;
  username: string;
  email?: string;
  memberType?: string;
}

export function TestAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // 초기 사용자 정보 로드
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('사용자 인증 상태 확인 중...');
      const userData = await api.getCurrentUser();
      if (userData) {
        setUser(userData as User);
        console.log('현재 사용자 정보:', userData);
      } else {
        console.log('인증된 사용자 없음');
        setUser(null);
      }
    } catch (error) {
      console.error('인증 상태 확인 오류:', error);
    }
  };

  const handleTestLogin = async () => {
    try {
      setLoading(true);
      console.log('테스트 로그인 시도...');
      
      const response = await api.testLogin();
      
      console.log('테스트 로그인 성공:', response);
      // 응답 타입 안전하게 처리
      if (response && typeof response === 'object' && 'user' in response && response.user) {
        const userData = response.user as User;
        setUser(userData);
        
        toast({
          title: '테스트 로그인 성공',
          description: `${userData.username}님으로 로그인되었습니다.`,
        });
      }
    } catch (error) {
      console.error('테스트 로그인 오류:', error);
      toast({
        title: '테스트 로그인 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      console.log('로그아웃 시도...');
      
      await api.logout();
      
      console.log('로그아웃 성공');
      setUser(null);
      
      toast({
        title: '로그아웃 성공',
        description: '성공적으로 로그아웃되었습니다.',
      });
    } catch (error) {
      console.error('로그아웃 오류:', error);
      toast({
        title: '로그아웃 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setLoading(true);
      await checkAuthStatus();
      toast({
        title: '인증 상태 새로고침',
        description: user ? '인증됨' : '인증되지 않음',
      });
    } catch (error) {
      toast({
        title: '인증 상태 확인 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>인증 테스트</CardTitle>
        <CardDescription>세션 기반 인증 테스트 컴포넌트</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 border rounded-md bg-muted">
            <h3 className="font-medium">현재 인증 상태</h3>
            {user ? (
              <div className="mt-2">
                <p className="text-sm"><span className="font-medium">사용자 ID:</span> {user.id}</p>
                <p className="text-sm"><span className="font-medium">사용자명:</span> {user.username}</p>
                <p className="text-sm"><span className="font-medium">이메일:</span> {user.email || '(없음)'}</p>
                <p className="text-sm"><span className="font-medium">회원 유형:</span> {user.memberType || '일반'}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">로그인되지 않음</p>
            )}
          </div>
          
          <div className="py-2">
            <p className="text-sm text-muted-foreground">쿠키 정보: {document.cookie || '(없음)'}</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 flex-wrap">
        {!user ? (
          <Button 
            onClick={handleTestLogin} 
            disabled={loading}
            variant="default"
          >
            테스트 로그인
          </Button>
        ) : (
          <Button 
            onClick={handleLogout} 
            disabled={loading}
            variant="destructive"
          >
            로그아웃
          </Button>
        )}
        
        <Button 
          onClick={handleRefreshStatus} 
          disabled={loading}
          variant="outline"
        >
          인증 상태 새로고침
        </Button>
      </CardFooter>
    </Card>
  );
}