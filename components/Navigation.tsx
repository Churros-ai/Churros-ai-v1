'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { Sparkles, Users, Settings } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';
    setIsOnboardingComplete(onboardingComplete);
  }, []);

  const navItems = [
    { href: '/', label: 'Home', icon: Sparkles },
    { href: '/search', label: 'Search', icon: Users, requiresOnboarding: true },
    { href: '/onboarding', label: 'Setup', icon: Settings, showIfNotComplete: true },
  ];

  // Don't render navigation items that depend on client state until we're on the client
  if (!isClient) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#E0531F] rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#242424]">Churros AI</span>
            </Link>

            {/* Navigation Links - Only show Home initially */}
            <div className="flex items-center space-x-1">
              <Link href="/">
                <Button
                  variant={pathname === '/' ? "default" : "ghost"}
                  className={`${
                    pathname === '/' 
                      ? "bg-[#E0531F] text-white" 
                      : "text-gray-600 hover:text-[#E0531F] hover:bg-[#E0531F]/5"
                  }`}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#E0531F] rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#242424]">Churros AI</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              // Skip items that require onboarding but onboarding isn't complete
              if (item.requiresOnboarding && !isOnboardingComplete) return null;
              
              // Skip items that should only show if onboarding isn't complete
              if (item.showIfNotComplete && isOnboardingComplete) return null;

              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`${
                      isActive 
                        ? "bg-[#E0531F] text-white" 
                        : "text-gray-600 hover:text-[#E0531F] hover:bg-[#E0531F]/5"
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
} 