import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

/**
 * Google OAuth2 인증 훅
 * Firebase를 사용하지 않고 직접적인 Google OAuth2 방식 사용
 */
export function useGoogleAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Google 로그인 URL 요청
  const getGoogleLoginUrl = useMutation({
    mutationFn: async () => {
      console.log('[Google OAuth] 로그인 URL 요청 시작');
      
      const response = await fetch('/api/google-oauth/login', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Google 로그인 URL 생성에 실패했습니다.');
      }

      const data = await response.json();
      console.log('[Google OAuth] 로그인 URL 생성 성공');
      
      return data;
    },
    onSuccess: (data) => {
      if (data.success && data.authUrl) {
        console.log('[Google OAuth] Google 인증 페이지로 이동:', data.authUrl.substring(0, 50) + '...');
        
        // Google 인증 페이지로 리디렉트
        window.location.href = data.authUrl;
      } else {
        throw new Error('로그인 URL을 받지 못했습니다.');
      }
    },
    onError: (error: Error) => {
      console.error('[Google OAuth] 로그인 URL 요청 오류:', error);
      toast({
        title: "로그인 오류",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Google OAuth 콜백 처리
  const handleGoogleCallback = useMutation({
    mutationFn: async (code: string) => {
      console.log('[Google OAuth] 콜백 처리 시작');
      
      const response = await fetch(`/api/google-oauth/callback?code=${encodeURIComponent(code)}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Google 로그인 처리에 실패했습니다.');
      }

      const data = await response.json();
      console.log('[Google OAuth] 콜백 처리 성공:', {
        success: data.success,
        userEmail: data.user?.email?.substring(0, 3) + '...'
      });
      
      return data;
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        // 사용자 정보 캐시 업데이트
        queryClient.setQueryData(["/api/auth/me"], data.user);
        
        console.log('[Google OAuth] 로그인 성공, 사용자 정보 업데이트 완료');
        
        toast({
          title: "로그인 성공",
          description: `환영합니다, ${data.user.name || data.user.email}님!`,
          variant: "default",
        });

        // 홈 페이지로 리디렉트
        if (data.redirectUrl) {
          setTimeout(() => {
            window.location.href = data.redirectUrl;
          }, 1000);
        }
      } else {
        throw new Error('로그인 응답 데이터가 올바르지 않습니다.');
      }
    },
    onError: (error: Error) => {
      console.error('[Google OAuth] 콜백 처리 오류:', error);
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // 로그아웃
  const logout = useMutation({
    mutationFn: async () => {
      console.log('[Google OAuth] 로그아웃 요청');
      
      const response = await fetch('/api/google-oauth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '로그아웃에 실패했습니다.');
      }

      const data = await response.json();
      console.log('[Google OAuth] 로그아웃 성공');
      
      return data;
    },
    onSuccess: () => {
      // 캐시 초기화
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      console.log('[Google OAuth] 로그아웃 완료, 캐시 초기화');
      
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
        variant: "default",
      });

      // 로그인 페이지로 리디렉트
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
    },
    onError: (error: Error) => {
      console.error('[Google OAuth] 로그아웃 오류:', error);
      toast({
        title: "로그아웃 오류",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    loginWithGoogle: getGoogleLoginUrl.mutate,
    handleCallback: handleGoogleCallback.mutate,
    logout: logout.mutate,
    isLoggingIn: getGoogleLoginUrl.isPending,
    isProcessingCallback: handleGoogleCallback.isPending,
    isLoggingOut: logout.isPending
  };
}

/**
 * URL에서 Google OAuth 콜백 코드 확인 및 처리
 */
export function useGoogleCallbackHandler() {
  const { handleCallback } = useGoogleAuth();

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('[Google OAuth] 콜백 오류:', error);
      // 오류 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      console.log('[Google OAuth] 콜백 코드 감지:', code.substring(0, 20) + '...');
      
      // 콜백 처리
      handleCallback(code);
      
      // URL에서 코드 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [handleCallback]);
}

// React import 추가
import React from 'react';