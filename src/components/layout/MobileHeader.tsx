import { Link } from 'react-router-dom';
import { Menu, Search, Bell } from 'lucide-react';
import { useAtom } from 'jotai';
import { isMobileMenuOpenAtom } from '../../lib/uiStore';

interface MobileHeaderProps {
  title: string;
  showSearch?: boolean;
}

const MobileHeader = ({ title, showSearch = false }: MobileHeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useAtom(isMobileMenuOpenAtom);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between h-16 px-4">
        <button 
          className="text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <Menu size={24} />
        </button>
        
        {showSearch && (
          <button className="text-gray-500 hover:text-gray-700 transition-colors">
            <Search size={20} />
          </button>
        )}
      </div>
      
      {/* Centered Logo and Title */}
      <div className="text-center pb-4 px-4">
        <Link to="/" className="inline-block">
          <div className="w-12 h-12 bg-primary-600 rounded-md flex items-center justify-center ">
            <span className="text-white text-lg font-bold">💰</span>
          </div>
        </Link>
        <h1 className="text-lg font-bold mt-2">{title}</h1>
      </div>
    </div>
  );
};

export default MobileHeader;
