import React from 'react';
import { useMobileRevolution } from '../../hooks/useMobileRevolution';
import MobileRevolution from '../../components/mobile/MobileRevolution';

export default function MobileTest() {
  const mobileData = useMobileRevolution();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Mobile Test Page</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="text-lg font-semibold mb-2">Mobile Detection Data:</h2>
        <pre className="text-sm">{JSON.stringify(mobileData.debugData, null, 2)}</pre>
      </div>
      
      <div className="bg-blue-100 p-4 rounded mb-4">
        <h2 className="text-lg font-semibold mb-2">Should Render Mobile:</h2>
        <p className="text-lg font-bold text-blue-600">
          {mobileData.shouldRenderMobile ? 'YES' : 'NO'}
        </p>
      </div>
      
      <div className="bg-green-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Mobile Component Test:</h2>
        {mobileData.shouldRenderMobile ? (
          <div className="border-2 border-green-500 p-4 rounded">
            <p className="text-green-600 font-bold">MobileRevolution should render below:</p>
            <MobileRevolution
              isMobile={true}
              currentView="dashboard"
              onViewChange={(view) => console.log('View change:', view)}
              onUpload={() => console.log('Upload triggered')}
              isProcessing={false}
              transactionCount={0}
              discoveries={[]}
              activeEmployee=""
              notifications={0}
              onEmployeeSelect={(employeeId) => console.log('Employee selected:', employeeId)}
              onStoryAction={(action, storyId) => console.log('Story action:', action, storyId)}
            />
          </div>
        ) : (
          <p className="text-red-600 font-bold">MobileRevolution will NOT render (not mobile)</p>
        )}
      </div>
    </div>
  );
}