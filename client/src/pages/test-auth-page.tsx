import React from 'react';
import { TestAuth } from '@/components/TestAuth';

export default function TestAuthPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8 text-center">인증 시스템 테스트</h1>
      <TestAuth />
    </div>
  );
}