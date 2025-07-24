import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface CreditBoostCardProps {
  image?: string;
}

const CreditBoostCard = ({ image }: CreditBoostCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-amber-50 rounded-xl shadow-lg overflow-hidden"
    >
      <div className="p-5">
        <div className="flex justify-center mb-4">
          <img 
            src={image || "https://images.pexels.com/photos/7821485/pexels-photo-7821485.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"} 
            alt="Credit boost illustration" 
            className="w-32 h-32 object-contain"
          />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Boost Your Credit with Every Rent Payment!
        </h3>
        
        <p className="text-gray-700 text-sm mb-4">
          Join thousands of renters using Rent Advantage to strengthen their credit profiles
        </p>
        
        <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center">
          <TrendingUp size={16} className="mr-2" />
          Get Started
        </button>
      </div>
    </motion.div>
  );
};

export default CreditBoostCard;
