import { useNavigate } from 'react-router-dom';
import { pathFor } from './registry';
import { RouteSlug } from './protocol';

export function useAgentNav() {
  const navigate = useNavigate();
  return {
    go(slug: RouteSlug) {
      navigate(pathFor(slug));
    }
  };
}
