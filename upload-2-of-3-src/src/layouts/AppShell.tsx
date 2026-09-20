import React, { useEffect } from 'react';
import { Outlet, useLocation as useUrlLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { MobileNav } from '../components/layout/MobileNav';
import { Topbar } from '../components/layout/Topbar';

export const AppShell: React.FC = () => {
  const urlLocation = useUrlLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [urlLocation.pathname]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main key={urlLocation.pathname} className="animate-fade-in flex-1 px-4 sm:px-6 py-5 pb-24 lg:pb-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
};
