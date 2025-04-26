import React from 'react';
import { Link } from 'wouter';
import { Bell, Search } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-primary-lavender to-primary-mint safe-area-top">
      <div className="mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-darkest">
            <span className="text-white">Mom's</span> Service
          </h1>
        </Link>
        
        {/* Action icons */}
        <div className="flex items-center space-x-4">
          <button className="w-8 h-8 flex items-center justify-center text-white hover:text-neutral-darkest transition-colors rounded-full">
            <Search size={22} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-white hover:text-neutral-darkest transition-colors rounded-full">
            <Bell size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}