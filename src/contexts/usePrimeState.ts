import { useContext } from 'react';
import type { PrimeState } from '../types/prime-state';
import { PrimeContext } from './PrimeContext';

export function usePrimeState(): PrimeState | null {
  return useContext(PrimeContext);
}
