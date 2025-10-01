import { Shield, Mail, Crown, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AccessDeniedProps {
  type?: 'admin' | 'premium' | 'private-beta';
  message?: string;
  showUpgrade?: boolean;
}

const AccessDenied = ({ 
  type = 'admin', 
  message,
  showUpgrade = false 
}: AccessDeniedProps) => {
  const getContent = () => {
    switch (type) {
      case 'private-beta':
        return {
          icon: <Shield size={48} className="text-primary-600" />,
          title: 'Private Beta Access',
          description: message || 'XspensesAI is currently in private testing. Access is restricted to invited users only.',
          action: (
            <div className="space-y-4">
              <p className="text-gray-600">
                Interested in early access? Contact us for an invitation.
              </p>
              <a 
                href="mailto:support@xspensesai.com?subject=Private Beta Access Request"
                className="btn-primary inline-flex items-center"
              >
                <Mail size={16} className="mr-2" />
                Request Access
              </a>
            </div>
          )
        };
      
      case 'premium':
        return {
          icon: <Crown size={48} className="text-yellow-600" />,
          title: 'Premium Feature',
          description: message || 'This feature is available to Premium subscribers only.',
          action: showUpgrade ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">Premium Benefits:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• AI-powered insights and suggestions</li>
                  <li>• Advanced categorization rules</li>
                  <li>• Unlimited receipt scanning</li>
                  <li>• Priority email support</li>
                  <li>• Export to multiple formats</li>
                </ul>
              </div>
              <button className="btn-primary bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                <Crown size={16} className="mr-2" />
                Upgrade to Premium
              </button>
            </div>
          ) : null
        };
      
      default: // admin
        return {
          icon: <Shield size={48} className="text-error-600" />,
          title: 'Restricted Access',
          description: message || 'This area is restricted to administrators only.',
          action: (
            <div className="space-y-4">
              <p className="text-gray-600">
                If you believe you should have access, please contact support.
              </p>
              <a 
                href="mailto:support@xspensesai.com?subject=Access Request"
                className="btn-outline inline-flex items-center"
              >
                <Mail size={16} className="mr-2" />
                Contact Support
              </a>
            </div>
          )
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div
        className=" w-full"
      >
        <div className="text-center mb-8">
          <div
            className="w-20 h-20  mb-6 bg-gray-100 rounded-full flex items-center justify-center"
          >
            {content.icon}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {content.title}
          </h1>
          
          <p className="text-gray-600 mb-8">
            {content.description}
          </p>
          
          {content.action && (
            <div
            >
              {content.action}
            </div>
          )}
        </div>
        
        <div
          className="text-center"
        >
          <Link 
            to="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
