/**
 * 모바일 인증 우회 컴포넌트
 * 
 * 모바일 환경에서 세션 쿠키 기반 인증이 실패할 경우 사용하는
 * 임시 로그인 해결책입니다.
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'wouter/use-location';

interface MobileBypassProps {
  onLogin: (userData: any) => void;
}

export function MobileLoginBypass({ onLogin }: MobileBypassProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 저장된 로그인 정보 확인
  useEffect(() => {
    const savedAuth = localStorage.getItem('mobile_bypass_auth');
    if (savedAuth) {
      try {
        const userData = JSON.parse(savedAuth);
        if (userData.email && userData.name) {
          setEmail(userData.email);
          setName(userData.name);
        }
      } catch (e) {
        console.error('저장된 인증 정보 파싱 오류:', e);
      }
    }
  }, []);

  const handleBypassLogin = () => {
    if (!email.trim()) {
      toast({
        title: "이메일 주소가 필요합니다",
        description: "이메일 주소를 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    // 임시 사용자 프로필 생성
    const tempUserData = {
      id: Date.now(),  // 임시 ID
      email: email,
      username: email.split('@')[0],
      fullName: name || email.split('@')[0],
      memberType: 'general',
      isAuthenticated: true,
      loginMethod: 'mobile_bypass'
    };

    // 로컬 스토리지에 저장
    localStorage.setItem('mobile_bypass_auth', JSON.stringify(tempUserData));
    localStorage.setItem('auth_status', 'logged_in');

    // 부모 컴포넌트에 로그인 알림
    onLogin(tempUserData);

    toast({
      title: "모바일 로그인 완료",
      description: "임시 모바일 계정으로 로그인되었습니다",
      variant: "default"
    });

    setIsSubmitting(false);

    // 홈페이지로 이동
    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-xl font-bold">모바일 로그인</CardTitle>
        <CardDescription className="text-center">
          모바일 세션 인증 우회를 위한 임시 로그인 방식입니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">이메일 주소</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">이름 (선택사항)</Label>
          <Input
            id="name"
            type="text"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleBypassLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? '처리 중...' : '모바일 로그인'}
        </Button>
      </CardFooter>
    </Card>
  );
}