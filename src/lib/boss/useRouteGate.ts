import { useLocation } from 'react-router-dom';

export function useRouteGate() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  
  return { isDashboard };
}
