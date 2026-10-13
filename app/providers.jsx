'use client';
import { Suspense } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import Navbar from '@/components/layout/Navbar';
import ToastContainer from '@/components/ui/ToastContainer';

function AppShell({ children }) {
  const { toast } = useAuth();
  return (
    <>
      <Suspense fallback={<div style={{ height: 'var(--navbar-height)' }} />}>
        <Navbar />
      </Suspense>
      <main style={{ paddingTop: 'var(--navbar-height)', position: 'relative', zIndex: 1 }}>
        <Suspense fallback={<div className="loading-overlay"><div className="spinner lg" /></div>}>
          {children}
        </Suspense>
      </main>
      {toast && <ToastContainer toast={toast} />}
    </>
  );
}

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <DataProvider>
        <AppShell>{children}</AppShell>
      </DataProvider>
    </AuthProvider>
  );
}
