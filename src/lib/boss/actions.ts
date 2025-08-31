import { useNavigate } from 'react-router-dom';
import { INTENT_TO_ROUTE } from './intents';

export function useBossActions() {
  const navigate = useNavigate();

  function go(intent: keyof typeof INTENT_TO_ROUTE) {
    const target = INTENT_TO_ROUTE[intent];
    if (!target) return;
    navigate(target.route);
  }

  return { go };
}
