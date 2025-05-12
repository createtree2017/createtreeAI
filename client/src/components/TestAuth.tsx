import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/apiClient';

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
      
      const data = await api.testLogin();
      
      console.log('테스트 로그인 성공:', data);
      // 응답 타입 안전하게 처리
      if (data && typeof data === 'object' && 'user' in data && data.user) {
        const userData = data.user as User;
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
        description: '인증 상태가 업데이트되었습니다.',
      });
    } catch (error) {
      console.error('인증 상태 새로고침 오류:', error);
      toast({
        title: '새로고침 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-[380px] mx-auto">
      <CardHeader>
        <CardTitle>인증 테스트</CardTitle>
        <CardDescription>사용자 인증 상태를 테스트합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <div className="space-y-2">
            <p className="font-semibold">로그인 상태: <span className="text-green-500">로그인됨</span></p>
            <div className="rounded-md border p-4 bg-muted/50">
              <p><span className="font-medium">사용자 ID:</span> {user.id}</p>
              <p><span className="font-medium">사용자명:</span> {user.username}</p>
              {user.email && <p><span className="font-medium">이메일:</span> {user.email}</p>}
              {user.memberType && <p><span className="font-medium">회원 유형:</span> {user.memberType}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold">로그인 상태: <span className="text-red-500">로그인 안됨</span></p>
            <p className="text-muted-foreground">로그인하려면 테스트 로그인 버튼을 클릭하세요.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <div className="flex justify-between w-full gap-3">
          {user ? (
            <Button className="w-1/2" variant="destructive" onClick={handleLogout} disabled={loading}>
              {loading ? '처리 중...' : '로그아웃'}
            </Button>
          ) : (
            <Button className="w-1/2" onClick={handleTestLogin} disabled={loading}>
              {loading ? '처리 중...' : '테스트 로그인'}
            </Button>
          )}
          <Button className="w-1/2" variant="outline" onClick={handleRefreshStatus} disabled={loading}>
            {loading ? '새로고침 중...' : '상태 새로고침'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}