import { motion } from 'framer-motion';
import { Key } from 'lucide-react';

const RentAdvantageCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl shadow-lg p-5"
    >
      <div className="flex items-center mb-3">
        <Key size={20} className="text-indigo-600 mr-2" />
        <h3 className="font-semibold text-gray-900">Rent Advantage™</h3>
      </div>
      
      <p className="text-gray-700 text-sm mb-4">
        Report your rent on your Equifax Canada credit report and start building your credit history!
      </p>
      
      <div className="mt-4 text-center">
        <button className="text-indigo-600 font-semibold text-sm">
          LEARN MORE
        </button>
      </div>
    </motion.div>
  );
};

export default RentAdvantageCard;
