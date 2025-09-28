// Export all Prime module components
export { default as PrimeLabPage } from './pages/PrimeLabPage';
export { PrimeChat } from './components/PrimeChat';

export const isPrimeEnabled = () => {
  return import.meta.env.VITE_ENABLE_PRIME_MODULE === 'true';
};
