import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="min-h-screen flex flex-col bg-ice-blue">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-display font-bold text-winter-dark text-center">
            ❄️ Family Olympics ❄️
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/') 
                ? 'text-winter-accent' 
                : 'text-winter-gray hover:text-winter-accent'
            }`}
          >
            <span className="text-2xl mb-1">🏠</span>
            <span className="text-xs font-medium">Home</span>
          </Link>
          
          <Link
            to="/schedule"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/schedule') 
                ? 'text-winter-accent' 
                : 'text-winter-gray hover:text-winter-accent'
            }`}
          >
            <span className="text-2xl mb-1">📅</span>
            <span className="text-xs font-medium">Schedule</span>
          </Link>
          
          <Link
            to="/judge"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/judge') 
                ? 'text-winter-accent' 
                : 'text-winter-gray hover:text-winter-accent'
            }`}
          >
            <span className="text-2xl mb-1">⚖️</span>
            <span className="text-xs font-medium">Judge</span>
          </Link>
          
          <Link
            to="/admin"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive('/admin') 
                ? 'text-winter-accent' 
                : 'text-winter-gray hover:text-winter-accent'
            }`}
          >
            <span className="text-2xl mb-1">🔐</span>
            <span className="text-xs font-medium">Admin</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

