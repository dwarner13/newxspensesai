import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import PrimeRouter from '../components/PrimeRouter';

export default function AuthLayout() {
  useEffect(() => {
    document.body.classList.add('auth-page');
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);

  return (
    <PrimeRouter>
      <main className="min-h-screen">
        <Outlet />
      </main>
    </PrimeRouter>
  );
}




