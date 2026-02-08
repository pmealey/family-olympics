import React from 'react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-ice-blue">
      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
};

