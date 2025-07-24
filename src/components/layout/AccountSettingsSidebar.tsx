import { useState } from 'react';
import {
  User,
  CreditCard,
  Zap,
  Layers,
  BookOpen,
  Share2,
  HelpCircle,
  Settings,
  Lock,
  Bell,
  Download,
  Code,
  Tag,
  DollarSign,
  FileText,
  Link2,
  Users,
  BarChart2,
  ChevronDown,
  Star,
  MessageCircle,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const sections = [
  { label: 'Account & Users', icon: <Users size={18} />, to: '/settings/profile' },
  { label: 'Subscription & Billing', icon: <CreditCard size={18} />, to: '/settings/billing' },
  { label: 'Integrations', icon: <Link2 size={18} />, to: '/settings/integrations' },
  { label: 'Automations (AI Chatbot)', icon: <Zap size={18} />, to: '/settings/ai-chatbot', upgrade: true },
  { label: 'Income & Expense Categories', icon: <Layers size={18} />, to: '/settings/categories', aiRestructure: true },
  { label: 'Document Tags', icon: <Tag size={18} />, to: '/settings/tags' },
  { label: 'Payment Methods', icon: <DollarSign size={18} />, to: '/settings/payments' },
  { label: 'Tax Rates', icon: <BarChart2 size={18} />, to: '/settings/tax' },
  { label: 'Add Receipts via Email', icon: <FileText size={18} />, to: '/settings/email' },
  { label: 'Linked Accounts', icon: <Link2 size={18} />, to: '/settings/linked-accounts' },
  { label: 'Tutorials', icon: <BookOpen size={18} />, to: '/settings/tutorials' },
  { label: 'Affiliate Program', icon: <Share2 size={18} />, to: '/settings/affiliate' },
  { label: 'Profile', icon: <User size={18} />, to: '/settings/profile-edit' },
  { label: 'Security & Privacy', icon: <Lock size={18} />, to: '/settings/security' },
  { label: 'Notifications', icon: <Bell size={18} />, to: '/settings/notifications' },
  { label: 'Support & Feedback', icon: <MessageCircle size={18} />, to: '/settings/support' },
  { label: 'Data Export', icon: <Download size={18} />, to: '/settings/export' },
  { label: 'API Access', icon: <Code size={18} />, to: '/settings/api' },
];

export default function AccountSettingsSidebar() {
  const [open, setOpen] = useState(true);
  return (
    <aside className={`w-72 bg-white border-r shadow-md h-full flex flex-col p-4`}>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold">
            DW
          </div>
          <div>
            <div className="font-bold text-lg text-gray-900">Darrell Warner13</div>
            <div className="text-xs text-gray-500">darrell.warner13@gmail.com</div>
          </div>
        </div>
        <div className="mt-2">
          <button className="w-full bg-yellow-100 text-yellow-800 font-semibold rounded px-3 py-2 text-xs hover:bg-yellow-200 transition">
            Upgrade to Pro for unlimited features
          </button>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {sections.map((section) => (
          <div key={section.label} className="relative group">
            <NavLink
              to={section.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded transition font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 ${isActive ? 'bg-primary-100 text-primary-700' : ''}`
              }
            >
              {section.icon}
              <span>{section.label}</span>
              {section.upgrade && (
                <span className="ml-2 text-xs text-primary-600 bg-primary-50 rounded px-2 py-0.5">Upgrade</span>
              )}
            </NavLink>
            {section.aiRestructure && (
              <button className="ml-10 mt-1 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 hover:bg-blue-100 transition">
                Let AI Restructure for You
              </button>
            )}
          </div>
        ))}
      </nav>
      <div className="mt-8 text-xs text-gray-400 text-center">
        XspensesAI &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
} 