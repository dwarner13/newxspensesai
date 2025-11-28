/**
 * Test Page - Simple test to verify routing works
 */
import { useEffect } from 'react';

export default function TestPage() {
  useEffect(() => {
    console.log('[TestPage] Component mounted!');
    alert('TestPage loaded successfully!');
  }, []);

  return (
    <div className="p-8 bg-red-500 text-white text-2xl font-bold">
      TEST PAGE LOADED - If you see this, routing works!
    </div>
  );
}




