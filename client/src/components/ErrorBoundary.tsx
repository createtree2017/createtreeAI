import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 오류 발생 시 앱 전체가 크래시되지 않도록 처리하는 ErrorBoundary 컴포넌트
 * 세션 유지를 위해 새로고침 대신 홈으로 이동하는 버튼을 제공합니다.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('에러 경계 컴포넌트에서 오류 발생:', error, errorInfo);
    
    // 필요한 경우 여기에 오류 로깅 서비스 호출 코드 추가
  }

  render() {
    if (this.state.hasError) {
      // 기본 폴백 UI
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">
            <div className="flex flex-col items-center text-center">
              <div className="text-red-500 text-6xl mb-4">!</div>
              <h2 className="text-2xl font-bold mb-4">문제가 발생했습니다</h2>
              <p className="text-gray-600 mb-6">
                페이지 로딩 중 오류가 발생했습니다. 다시 시도해주세요.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    window.location.href = '/';
                  }}
                  className="w-full"
                >
                  홈으로 이동
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="w-full"
                >
                  다시 시도
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;