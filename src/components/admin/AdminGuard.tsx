import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8ecf4', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14 }}>
      Verifying access...
    </div>
  );

  if (!(profile as any)?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
