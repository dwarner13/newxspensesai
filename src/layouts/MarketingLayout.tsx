import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import SimpleNavigation from '../components/layout/SimpleNavigation';
import PrimeRouter from '../components/PrimeRouter';
import Footer from '../components/layout/Footer';

export default function MarketingLayout() {
  useEffect(() => {
    document.body.classList.add('marketing-page');
    return () => {
      document.body.classList.remove('marketing-page');
    };
  }, []);

  return (
    <PrimeRouter>
      <SimpleNavigation />
      <main className="pt-16">
        <Outlet />
      </main>
      <Footer />
    </PrimeRouter>
  );
}
