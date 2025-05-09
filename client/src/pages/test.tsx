import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

const TestPage = () => {
  const [location, setLocation] = useLocation();
  const [prevPage, setPrevPage] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState({
    path: '',
    referrer: '',
    locationState: ''
  });

  useEffect(() => {
    // 이전 페이지 정보 저장
    setPrevPage(document.referrer);
    
    // 현재 라우팅 정보 수집
    setRouteInfo({
      path: window.location.pathname,
      referrer: document.referrer,
      locationState: location
    });
  }, [location]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-400 to-purple-500">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4">라우팅 테스트 페이지</h1>
        <p className="text-lg mb-6">이 페이지는 라우팅 진단용입니다</p>
        
        <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
          <h2 className="font-bold mb-2 text-lg">라우팅 정보:</h2>
          <p><strong>현재 경로:</strong> {routeInfo.path}</p>
          <p><strong>이전 페이지:</strong> {prevPage || '직접 접속'}</p>
          <p><strong>Wouter 위치:</strong> {routeInfo.locationState}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            onClick={() => window.history.back()}
          >
            이전으로 (history)
          </button>
          <button 
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
            onClick={() => setLocation("/")}
          >
            홈으로 (wouter)
          </button>
          <button 
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
            onClick={() => setLocation("/login")}
          >
            로그인 (wouter)
          </button>
          <button 
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
            onClick={() => window.location.href = "/login"}
          >
            로그인 (href)
          </button>
        </div>
        
        <p className="text-sm text-gray-500">
          라우팅 문제를 진단하기 위한 테스트 페이지입니다.
          다양한 방법으로 페이지 이동을 테스트해보세요.
        </p>
      </div>
    </div>
  );
};

export default TestPage;