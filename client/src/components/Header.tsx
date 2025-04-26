import React from 'react';
import { Link } from 'wouter';
import { Bell, Search, Home, Image, Music, MessageCircle, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-primary-lavender to-primary-mint safe-area-top shadow-md">
      <div className="mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-darkest font-heading">
            <span className="text-white">Mom's</span> <span className="text-neutral-darkest">Service</span>
          </h1>
        </Link>
        
        {/* Navigation - Visible on larger screens */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-white font-medium hover:text-neutral-darkest transition-colors font-body">
            Home
          </Link>
          <Link href="/image" className="text-white font-medium hover:text-neutral-darkest transition-colors font-body">
            Memory Art
          </Link>
          <Link href="/music" className="text-white font-medium hover:text-neutral-darkest transition-colors font-body">
            Lullaby
          </Link>
          <Link href="/chat" className="text-white font-medium hover:text-neutral-darkest transition-colors font-body">
            AI Companion
          </Link>
        </nav>
        
        {/* Action icons */}
        <div className="flex items-center space-x-4">
          <button 
            className="w-10 h-10 flex items-center justify-center text-white hover:text-neutral-darkest transition-colors rounded-full bg-white/20 hover:bg-white/30" 
            aria-label="Search"
          >
            <Search size={20} />
          </button>
          <button 
            className="w-10 h-10 flex items-center justify-center text-white hover:text-neutral-darkest transition-colors rounded-full bg-white/20 hover:bg-white/30"
            aria-label="Notifications"
          >
            <Bell size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}