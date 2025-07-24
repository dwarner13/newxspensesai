import { Link } from "react-router-dom";

export default function TopNavbar() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-gray-900 text-white shadow flex items-center justify-between h-16 px-8" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="text-xl font-bold tracking-tight">XspensesAI</div>
      <div className="flex items-center gap-4">
        <Link to="/pricing" className="text-sm text-gray-300 hover:text-white">Pricing</Link>
        <Link to="/dashboard" className="text-sm text-gray-300 hover:text-white">Dashboard</Link>
        <Link to="/logout" className="text-sm text-red-400 font-medium hover:underline">Logout</Link>
      </div>
    </header>
  );
} 
