import { useState, useCallback } from 'react';

export const useCreateExpenseModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSubmit = useCallback((data: { 
    files: File[]; 
    amount?: number; 
    description?: string; 
    category?: string 
  }) => {
    // Handle the expense creation here
    console.log('Creating expense:', data);
    
    // You can add your logic here to:
    // 1. Upload files to storage
    // 2. Process receipts with OCR
    // 3. Save expense to database
    // 4. Update UI
    
    // For now, just log the data
    if (data.files.length > 0) {
      console.log('Files to process:', data.files.map(f => f.name));
    }
    
    if (data.amount) {
      console.log('Manual expense amount:', data.amount);
    }
    
    closeModal();
  }, [closeModal]);

  return {
    isOpen,
    openModal,
    closeModal,
    handleSubmit
  };
}; 