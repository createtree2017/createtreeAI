/**
 * JWT 토큰 기반 인증 훅 - 모바일 환경에서 Firebase 인증 문제 해결용
 */
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface JwtAuthUser {
  id: number;
  email: string;
  username: string;
  role: string;
}

interface JwtAuthResponse {
  success: boolean;
  token: string;
  user: JwtAuthUser;
}

export function useJwtAuth() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<JwtAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 초기화 - 로컬 스토리지에서 토큰 로드
  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    if (storedToken) {
      setToken(storedToken);
      
      // 저장된 사용자 정보도 로드 (백업용)
      try {
        const storedUser = localStorage.getItem('jwt_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('사용자 정보 파싱 오류:', e);
      }
      
      // 토큰 유효성 검증 API 호출
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // 토큰 검증 함수
  const verifyToken = async (jwtToken: string) => {
    try {
      const response = await fetch('/api/jwt-auth/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: jwtToken })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          setIsLoading(false);
          return true;
        }
      }
      
      // 토큰이 유효하지 않으면 삭제
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('jwt_user');
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('토큰 검증 오류:', err);
      setError(err instanceof Error ? err : new Error('토큰 검증 중 오류가 발생했습니다.'));
      setIsLoading(false);
      return false;
    }
  };

  // Firebase UID로 모바일 로그인 (JWT 발급)
  const mobileLogin = useMutation({
    mutationFn: async ({ firebaseUid, email }: { firebaseUid: string, email: string }) => {
      const response = await fetch('/api/jwt-auth/mobile-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firebaseUid, email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '모바일 로그인에 실패했습니다.');
      }

      const data: JwtAuthResponse = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // JWT 토큰 및 사용자 정보 저장
      setToken(data.token);
      setUser(data.user);
      
      // 로컬 스토리지에도 저장
      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('jwt_user', JSON.stringify(data.user));
      
      toast({
        title: '모바일 로그인 성공',
        description: '환영합니다!',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: '모바일 로그인 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // 기존 세션에서 JWT 토큰 발급 (세션 백업용)
  const issueTokenFromSession = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/jwt-auth/issue-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // 세션 쿠키 포함
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'JWT 토큰 발급에 실패했습니다.');
      }

      const data: JwtAuthResponse = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // JWT 토큰 및 사용자 정보 저장
      setToken(data.token);
      setUser(data.user);
      
      // 로컬 스토리지에도 저장
      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('jwt_user', JSON.stringify(data.user));
      
      console.log('JWT 토큰이 성공적으로 발급되었습니다.');
    },
    onError: (error: Error) => {
      console.error('JWT 토큰 발급 실패:', error);
    }
  });

  // 로그아웃
  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_user');
    setToken(null);
    setUser(null);
    
    toast({
      title: '로그아웃 성공',
      description: '안녕히 가세요!',
      variant: 'default',
    });
  };

  return {
    isAuthenticated: !!token && !!user,
    token,
    user,
    isLoading,
    error,
    mobileLogin: mobileLogin.mutate,
    issueTokenFromSession: issueTokenFromSession.mutate,
    logout,
    isMobileLoginLoading: mobileLogin.isPending,
  };
}