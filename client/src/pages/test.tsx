import React from 'react';

const TestPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-400 to-purple-500">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-4">테스트 페이지</h1>
        <p className="text-lg mb-6">이 페이지는 라우팅 테스트용입니다.</p>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          onClick={() => window.history.back()}
        >
          뒤로 가기
        </button>
      </div>
    </div>
  );
};

export default TestPage;