import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Key,
  Fingerprint,
  Database,
  Network,
  Server,
  FileText,
  Send, 
  Loader2,
  Zap,
  Clock,
  Users,
  Building,
  Home,
  Car,
  GraduationCap,
  Heart,
  Briefcase,
  Plane,
  Coffee,
  Wifi,
  Phone,
  BookOpen,
  Target,
  BarChart3,
  Activity,
  Brain,
  Lightbulb,
  Cpu,
  Workflow,
  Automation,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  CreditCard,
  Receipt,
  FileText as FileTextIcon,
  Database as DatabaseIcon,
  Filter,
  Search,
  Download,
  Share2,
  Settings,
  Info,
  HelpCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shield as ShieldIcon,
  Lock as LockIcon,
  Eye as EyeIcon,
  AlertTriangle as AlertTriangleIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Key as KeyIcon,
  Fingerprint as FingerprintIcon,
  Database as DatabaseIcon2,
  Network as NetworkIcon,
  Server as ServerIcon,
  FileText as FileTextIcon2,
  UserCheck,
  UserX,
  CreditCard as CreditCardIcon,
  Smartphone,
  Monitor,
  Globe,
  Wifi as WifiIcon,
  Bluetooth,
  HardDrive,
  Cloud,
  CloudOff,
  Download as DownloadIcon,
  Upload,
  Copy,
  Paste,
  Scissors,
  Link,
  Link2,
  Unlink,
  Lock as LockIcon2,
  Unlock,
  Key as KeyIcon2,
  Hash,
  Code,
  Bug,
  Zap as ZapIcon,
  Flash,
  Battery,
  BatteryCharging,
  Power,
  PowerOff,
  Wifi as WifiIcon2,
  WifiOff,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero
} from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEmployeeConfig,
  getConversation,
  saveConversation,
  addMessageToConversation,
  incrementConversationCount,
  logAIInteraction,
  generateConversationId,
  createSystemMessage,
  createUserMessage,
  createAssistantMessage
} from '../../lib/ai-employees';
import { AIConversationMessage } from '../../types/ai-employees.types';

interface CustodianMessage {
  role: 'user' | 'custodian' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function SecurityCompliance() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CustodianMessage[]>([
    {
      role: 'custodian',
      content: "Hello! I'm 🛡️ Custodian, your Security & Compliance AI! I help you ensure financial security, maintain compliance with regulations, protect sensitive data, and implement best practices for financial safety. I can help you secure your accounts, protect your data, prevent fraud, maintain compliance, and build a robust security framework. What security or compliance concern would you like to address today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [custodianConfig, setCustodianConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Custodian's config
  useEffect(() => {
    const initializeCustodian = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Custodian's configuration
      const config = await getEmployeeConfig('custodian');
      setCustodianConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'custodian', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as CustodianMessage[]);
      }
    };

    initializeCustodian();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: CustodianMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'custodian', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'custodian', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Custodian's response based on the user's query
      const custodianResponse = await generateCustodianResponse(content);

      const processingTime = Date.now() - startTime;

      const custodianMessage: CustodianMessage = {
        role: 'custodian',
        content: custodianResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-4'
        }
      };

      setMessages(prev => [...prev, custodianMessage]);

      // Save Custodian's response to conversation
      await addMessageToConversation(user.id, 'custodian', conversationId, custodianMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'custodian');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: CustodianMessage = {
        role: 'custodian',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCustodianResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Custodian's specialized responses for security and compliance queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Security status: all systems green. I've been monitoring your account protection and everything is locked down tight. Your financial privacy is completely secure, and I wanted to update you on some new protection features we've activated. How can I help you feel even more secure today, ${userName}?`;
    }

    if (query.includes('how are you') || query.includes('how\'s it going') || query.includes('how are things')) {
      return `I'm running at maximum security efficiency, thanks for asking! I've been conducting security sweeps this morning, and I'm getting excited about some new protection protocols I've discovered. You know what I love? When I can give people complete peace of mind about their financial security! What security concerns are we addressing today, ${userName}?`;
    }

    if (query.includes('i\'m ') || query.includes('im ') || query.includes('my name is') || query.includes('i am ')) {
      return `Oh ${userName}! Now I can properly address you while we secure your financial fortress! I love getting to know the people whose security I'm protecting. Your name will help me personalize your security strategy. What kind of protection are we implementing today? I'm getting excited about the security we're going to build around your financial life!`;
    }
    
    if (query.includes('security') || query.includes('protect') || query.includes('secure') || query.includes('safety')) {
      return `🛡️ Excellent! Let's build a comprehensive security framework to protect your financial data and assets. Here's my approach to financial security:

**Financial Security Framework:**

**1. Account Security:**
• **Multi-Factor Authentication** - Enable 2FA on all financial accounts
• **Strong Passwords** - Use unique, complex passwords for each account
• **Password Manager** - Use a secure password manager for credential storage
• **Account Monitoring** - Regularly monitor account activity for suspicious behavior
• **Account Recovery** - Set up secure account recovery options
• **Session Management** - Log out of accounts when not in use

**2. Data Protection:**
• **Encryption** - Ensure all sensitive data is encrypted at rest and in transit
• **Data Classification** - Identify and classify sensitive financial information
• **Access Controls** - Implement role-based access controls
• **Data Backup** - Maintain secure, encrypted backups of important data
• **Data Retention** - Establish data retention and disposal policies
• **Data Minimization** - Only collect and store necessary data

**3. Device Security:**
• **Device Encryption** - Encrypt all devices that contain financial data
• **Software Updates** - Keep all software and operating systems updated
• **Antivirus Protection** - Use reputable antivirus and anti-malware software
• **Firewall Protection** - Enable and configure firewalls on all devices
• **Secure Networks** - Only access financial accounts on secure networks
• **Device Management** - Implement mobile device management for business use

**4. Network Security:**
• **Secure Wi-Fi** - Use WPA3 encryption for wireless networks
• **VPN Usage** - Use VPNs when accessing financial data on public networks
• **Network Monitoring** - Monitor network traffic for suspicious activity
• **Guest Networks** - Separate guest networks from main networks
• **Router Security** - Change default router passwords and settings
• **Network Segmentation** - Separate financial data networks from general use

**5. Transaction Security:**
• **Fraud Monitoring** - Enable fraud alerts on all financial accounts
• **Transaction Limits** - Set appropriate transaction limits
• **Payment Verification** - Verify all payment details before confirming
• **Secure Payment Methods** - Use secure payment methods and avoid public computers
• **Receipt Management** - Securely store and manage transaction receipts
• **Dispute Resolution** - Know how to dispute unauthorized transactions

**6. Identity Protection:**
• **Credit Monitoring** - Monitor credit reports for suspicious activity
• **Identity Theft Protection** - Consider identity theft protection services
• **Document Security** - Securely store important financial documents
• **Social Security Protection** - Protect Social Security numbers and other identifiers
• **Mail Security** - Use secure mail handling for financial documents
• **Shredding** - Properly dispose of sensitive financial documents

**7. Business Security:**
• **Employee Training** - Train employees on security best practices
• **Access Management** - Implement proper access controls for business accounts
• **Vendor Security** - Assess security practices of financial service providers
• **Incident Response** - Have a plan for responding to security incidents
• **Compliance Monitoring** - Monitor compliance with security regulations
• **Security Audits** - Conduct regular security audits and assessments

**8. Privacy Protection:**
• **Privacy Settings** - Review and configure privacy settings on financial accounts
• **Data Sharing** - Limit data sharing with third parties
• **Opt-Out Options** - Exercise opt-out rights for data sharing
• **Privacy Policies** - Understand privacy policies of financial services
• **Data Rights** - Know your rights regarding personal data
• **Privacy Tools** - Use privacy-enhancing tools and services

**9. Physical Security:**
• **Document Storage** - Store important documents in secure locations
• **Safe Deposit Boxes** - Use safe deposit boxes for valuable documents
• **Home Security** - Implement home security measures
• **Travel Security** - Secure financial information when traveling
• **Office Security** - Secure financial data in office environments
• **Disaster Recovery** - Have plans for protecting data during disasters

**10. Incident Response:**
• **Security Incidents** - Know how to respond to security incidents
• **Breach Notification** - Understand breach notification requirements
• **Recovery Procedures** - Have procedures for recovering from security incidents
• **Legal Requirements** - Understand legal requirements for security incidents
• **Insurance Coverage** - Consider cyber insurance for additional protection
• **Professional Support** - Know when to seek professional security support

**Pro Tips:**
• **Layered Security** - Implement multiple layers of security protection
• **Regular Updates** - Keep security measures updated and current
• **User Education** - Educate all users on security best practices
• **Monitoring** - Continuously monitor for security threats
• **Testing** - Regularly test security measures and procedures
• **Documentation** - Maintain documentation of security procedures

What specific aspect of financial security would you like to address?`;
    }

    if (query.includes('compliance') || query.includes('regulation') || query.includes('legal') || query.includes('regulatory')) {
      return `⚖️ Excellent! Let's ensure your financial activities comply with all relevant regulations and legal requirements. Here's my approach to financial compliance:

**Financial Compliance Framework:**

**1. Tax Compliance:**
• **Tax Filing** - Ensure timely and accurate tax filings
• **Record Keeping** - Maintain required records for tax purposes
• **Deduction Compliance** - Follow rules for tax deductions and credits
• **Reporting Requirements** - Meet all tax reporting requirements
• **Audit Preparation** - Maintain records for potential audits
• **Tax Law Updates** - Stay current with changes in tax laws

**2. Banking Compliance:**
• **Bank Secrecy Act** - Comply with BSA requirements for large transactions
• **Anti-Money Laundering** - Follow AML regulations and reporting
• **Know Your Customer** - Provide required information to financial institutions
• **Transaction Reporting** - Report transactions as required by law
• **Account Verification** - Complete required account verification processes
• **Regulatory Updates** - Stay informed about banking regulation changes

**3. Investment Compliance:**
• **Securities Laws** - Comply with securities laws and regulations
• **Investment Adviser Rules** - Follow rules if providing investment advice
• **Disclosure Requirements** - Provide required disclosures to investors
• **Fiduciary Duties** - Meet fiduciary obligations when applicable
• **Trading Rules** - Follow trading rules and restrictions
• **Market Regulations** - Comply with market regulations and rules

**4. Business Compliance:**
• **Business Registration** - Maintain proper business registrations
• **Licensing Requirements** - Obtain and maintain required licenses
• **Employment Laws** - Comply with employment and payroll laws
• **Contract Compliance** - Ensure contracts meet legal requirements
• **Insurance Requirements** - Maintain required insurance coverage
• **Corporate Governance** - Follow corporate governance requirements

**5. Data Privacy Compliance:**
• **GDPR Compliance** - Follow GDPR requirements for EU data
• **CCPA Compliance** - Comply with California privacy laws
• **Data Protection Laws** - Follow applicable data protection regulations
• **Consent Management** - Properly manage data consent
• **Data Rights** - Honor data subject rights
• **Breach Notification** - Follow breach notification requirements

**6. Financial Reporting Compliance:**
• **GAAP Compliance** - Follow Generally Accepted Accounting Principles
• **Financial Statements** - Prepare accurate financial statements
• **Audit Requirements** - Meet audit requirements when applicable
• **Disclosure Standards** - Follow financial disclosure standards
• **Internal Controls** - Maintain adequate internal controls
• **Documentation** - Maintain proper financial documentation

**7. Consumer Protection Compliance:**
• **Fair Lending** - Comply with fair lending laws
• **Truth in Lending** - Follow Truth in Lending Act requirements
• **Fair Credit Reporting** - Comply with credit reporting laws
• **Debt Collection** - Follow debt collection regulations
• **Consumer Rights** - Honor consumer rights and protections
• **Dispute Resolution** - Provide proper dispute resolution processes

**8. International Compliance:**
• **Foreign Account Reporting** - Report foreign accounts as required
• **International Tax** - Comply with international tax requirements
• **Sanctions Compliance** - Follow economic sanctions and embargoes
• **Cross-Border Transactions** - Comply with cross-border transaction rules
• **Currency Reporting** - Report currency transactions as required
• **International Standards** - Follow international financial standards

**9. Industry-Specific Compliance:**
• **Healthcare Finance** - Comply with healthcare financial regulations
• **Real Estate Finance** - Follow real estate finance regulations
• **Insurance Compliance** - Meet insurance industry requirements
• **Retirement Plans** - Comply with retirement plan regulations
• **Cryptocurrency** - Follow cryptocurrency regulations
• **Fintech Compliance** - Meet fintech industry requirements

**10. Compliance Management:**
• **Compliance Programs** - Develop and maintain compliance programs
• **Risk Assessment** - Conduct regular compliance risk assessments
• **Training Programs** - Provide compliance training to staff
• **Monitoring Systems** - Implement compliance monitoring systems
• **Audit Procedures** - Establish compliance audit procedures
• **Remediation Plans** - Develop plans for addressing compliance issues

**Pro Tips:**
• **Stay Informed** - Keep up with regulatory changes and updates
• **Document Everything** - Maintain thorough documentation of compliance efforts
• **Seek Expert Advice** - Consult with legal and compliance experts when needed
• **Regular Reviews** - Conduct regular compliance reviews and assessments
• **Training** - Provide ongoing compliance training
• **Monitoring** - Continuously monitor compliance status

What specific compliance area would you like to address?`;
    }

    if (query.includes('fraud') || query.includes('scam') || query.includes('identity theft') || query.includes('phishing')) {
      return `🚨 Critical! Let's protect you from fraud, scams, and identity theft. Here's my comprehensive approach to fraud prevention:

**Fraud Prevention Framework:**

**1. Identity Theft Prevention:**
• **Personal Information Protection** - Never share sensitive information unnecessarily
• **Document Security** - Secure important documents like Social Security cards
• **Mail Security** - Use secure mail handling and shred sensitive documents
• **Credit Monitoring** - Monitor credit reports regularly for suspicious activity
• **Identity Theft Alerts** - Set up fraud alerts and credit freezes
• **Identity Theft Insurance** - Consider identity theft protection services

**2. Phishing Prevention:**
• **Email Security** - Be cautious of suspicious emails and links
• **Website Verification** - Verify website authenticity before entering information
• **URL Inspection** - Check URLs carefully for spoofing attempts
• **Attachment Safety** - Don't open suspicious email attachments
• **Social Engineering** - Be aware of social engineering tactics
• **Multi-Factor Authentication** - Use MFA to prevent account takeover

**3. Financial Fraud Prevention:**
• **Account Monitoring** - Regularly monitor all financial accounts
• **Transaction Verification** - Verify all transactions before confirming
• **Payment Security** - Use secure payment methods and avoid public computers
• **Card Security** - Protect credit and debit card information
• **ATM Safety** - Use ATMs in secure locations and check for skimmers
• **Wire Transfer Security** - Verify wire transfer details carefully

**4. Investment Fraud Prevention:**
• **Investment Verification** - Verify investment opportunities and advisors
• **High Returns** - Be skeptical of promises of unusually high returns
• **Pressure Tactics** - Avoid investments that use high-pressure sales tactics
• **Documentation** - Get all investment details in writing
• **Regulatory Compliance** - Verify investment advisors are properly licensed
• **Due Diligence** - Conduct thorough research before investing

**5. Business Fraud Prevention:**
• **Employee Screening** - Conduct background checks on employees
• **Internal Controls** - Implement strong internal controls and segregation of duties
• **Vendor Verification** - Verify vendors and suppliers before doing business
• **Invoice Verification** - Verify invoices and payment requests
• **Expense Monitoring** - Monitor business expenses for unusual patterns
• **Whistleblower Protection** - Establish whistleblower protection programs

**6. Online Security:**
• **Secure Websites** - Only use secure websites (HTTPS) for financial transactions
• **Password Security** - Use strong, unique passwords for all accounts
• **Software Updates** - Keep all software updated to prevent vulnerabilities
• **Antivirus Protection** - Use reputable antivirus and anti-malware software
• **Firewall Protection** - Enable and configure firewalls
• **Secure Networks** - Only access financial accounts on secure networks

**7. Mobile Security:**
• **Device Security** - Secure mobile devices with passwords and encryption
• **App Security** - Only download apps from trusted sources
• **Public Wi-Fi** - Avoid accessing financial accounts on public Wi-Fi
• **Bluetooth Security** - Disable Bluetooth when not in use
• **Location Services** - Be careful with location services and sharing
• **Device Updates** - Keep mobile devices updated

**8. Social Media Security:**
• **Privacy Settings** - Configure privacy settings on social media accounts
• **Information Sharing** - Be careful about sharing personal information online
• **Friend Requests** - Be cautious of friend requests from unknown people
• **Scam Awareness** - Be aware of scams that target social media users
• **Account Security** - Use strong passwords and enable two-factor authentication
• **Content Sharing** - Be careful about what you share online

**9. Elder Fraud Prevention:**
• **Family Communication** - Maintain open communication about financial matters
• **Power of Attorney** - Establish proper power of attorney arrangements
• **Caregiver Screening** - Screen caregivers and service providers
• **Financial Education** - Educate elderly family members about fraud risks
• **Monitoring** - Monitor financial accounts for unusual activity
• **Support Systems** - Establish support systems for elderly family members

**10. Incident Response:**
• **Fraud Detection** - Know how to detect fraud and suspicious activity
• **Reporting Procedures** - Know how to report fraud to authorities
• **Account Freezing** - Know how to freeze accounts if fraud is detected
• **Documentation** - Document all fraud incidents and communications
• **Recovery Procedures** - Have procedures for recovering from fraud
• **Legal Support** - Know when to seek legal support for fraud cases

**Pro Tips:**
• **Trust Your Instincts** - If something seems too good to be true, it probably is
• **Verify Everything** - Always verify information before taking action
• **Stay Informed** - Keep up with the latest fraud schemes and tactics
• **Report Suspicious Activity** - Report suspicious activity immediately
• **Educate Others** - Share fraud prevention information with family and friends
• **Regular Reviews** - Regularly review security measures and procedures

What specific fraud prevention area would you like to address?`;
    }

    if (query.includes('data protection') || query.includes('privacy') || query.includes('encryption') || query.includes('backup')) {
      return `🔒 Essential! Let's protect your sensitive financial data with comprehensive data protection measures. Here's my approach to data protection:

**Data Protection Framework:**

**1. Data Encryption:**
• **At-Rest Encryption** - Encrypt all sensitive data stored on devices
• **In-Transit Encryption** - Use HTTPS and VPNs for data transmission
• **End-to-End Encryption** - Use end-to-end encryption for communications
• **Database Encryption** - Encrypt databases containing financial information
• **File Encryption** - Encrypt individual files containing sensitive data
• **Key Management** - Properly manage encryption keys and certificates

**2. Access Control:**
• **User Authentication** - Implement strong user authentication systems
• **Role-Based Access** - Use role-based access controls for data access
• **Least Privilege** - Grant minimum necessary access to users
• **Access Monitoring** - Monitor and log all data access attempts
• **Session Management** - Manage user sessions and timeouts
• **Remote Access Security** - Secure remote access to data

**3. Data Classification:**
• **Sensitive Data Identification** - Identify and classify sensitive financial data
• **Data Labeling** - Label data according to sensitivity levels
• **Handling Procedures** - Establish procedures for handling different data types
• **Retention Policies** - Implement data retention and disposal policies
• **Data Inventory** - Maintain inventory of all sensitive data
• **Risk Assessment** - Assess risks associated with different data types

**4. Backup and Recovery:**
• **Regular Backups** - Perform regular backups of important data
• **Encrypted Backups** - Ensure backups are encrypted
• **Offsite Storage** - Store backups in secure offsite locations
• **Backup Testing** - Regularly test backup and recovery procedures
• **Version Control** - Maintain multiple versions of important data
• **Disaster Recovery** - Have disaster recovery plans for data protection

**5. Privacy Protection:**
• **Privacy Policies** - Develop and maintain privacy policies
• **Consent Management** - Properly manage user consent for data use
• **Data Minimization** - Only collect and store necessary data
• **Anonymization** - Anonymize data when possible
• **Right to Deletion** - Honor requests for data deletion
• **Privacy Impact Assessments** - Conduct privacy impact assessments

**6. Network Security:**
• **Firewall Protection** - Use firewalls to protect data networks
• **Network Segmentation** - Segment networks to isolate sensitive data
• **Intrusion Detection** - Implement intrusion detection systems
• **Network Monitoring** - Monitor network traffic for suspicious activity
• **Secure Protocols** - Use secure protocols for data transmission
• **Wireless Security** - Secure wireless networks and connections

**7. Device Security:**
• **Device Encryption** - Encrypt all devices that contain sensitive data
• **Device Management** - Implement mobile device management
• **Remote Wiping** - Enable remote wiping for lost or stolen devices
• **Software Updates** - Keep device software updated
• **Antivirus Protection** - Use antivirus and anti-malware software
• **Physical Security** - Secure physical access to devices

**8. Application Security:**
• **Secure Development** - Follow secure development practices
• **Code Review** - Conduct security code reviews
• **Vulnerability Testing** - Regularly test applications for vulnerabilities
• **Input Validation** - Validate all user inputs
• **Output Encoding** - Encode outputs to prevent injection attacks
• **Session Security** - Implement secure session management

**9. Third-Party Security:**
• **Vendor Assessment** - Assess security practices of third-party vendors
• **Contract Requirements** - Include security requirements in contracts
• **Data Sharing Agreements** - Establish secure data sharing agreements
• **Vendor Monitoring** - Monitor vendor security practices
• **Incident Response** - Include vendors in incident response plans
• **Compliance Verification** - Verify vendor compliance with security requirements

**10. Monitoring and Auditing:**
• **Security Monitoring** - Implement comprehensive security monitoring
• **Audit Logging** - Maintain detailed audit logs of data access
• **Alert Systems** - Set up alert systems for suspicious activity
• **Regular Audits** - Conduct regular security audits
• **Compliance Monitoring** - Monitor compliance with data protection requirements
• **Incident Detection** - Implement systems for detecting security incidents

**Pro Tips:**
• **Layered Protection** - Implement multiple layers of data protection
• **Regular Updates** - Keep security measures updated and current
• **User Training** - Train users on data protection best practices
• **Testing** - Regularly test data protection measures
• **Documentation** - Maintain documentation of data protection procedures
• **Continuous Improvement** - Continuously improve data protection measures

What specific aspect of data protection would you like to address?`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `🛡️ I'm here to help you protect your financial security and maintain compliance! Here's how I can support your security and compliance journey:

**My Security & Compliance Expertise:**
🛡️ **Security Protection** - Comprehensive financial security measures
⚖️ **Regulatory Compliance** - Ensure compliance with financial regulations
🚨 **Fraud Prevention** - Protect against fraud, scams, and identity theft
🔒 **Data Protection** - Secure sensitive financial data and information
📋 **Compliance Management** - Manage regulatory compliance requirements
🔍 **Risk Assessment** - Assess and mitigate security and compliance risks
📊 **Security Monitoring** - Monitor security status and compliance
🛠️ **Incident Response** - Respond to security incidents and breaches

**How I Can Help:**
• Implement comprehensive security measures for your finances
• Ensure compliance with financial regulations and laws
• Protect against fraud, scams, and identity theft
• Secure sensitive financial data and information
• Manage regulatory compliance requirements
• Assess and mitigate security and compliance risks
• Monitor security status and compliance
• Respond to security incidents and breaches

**My Approach:**
I believe that security and compliance are fundamental to financial success. I help you build robust security frameworks and maintain compliance with all relevant regulations.

**My Promise:**
I'll help you create a comprehensive security and compliance program that protects your financial interests and ensures regulatory adherence.

**Pro Tip:** Security and compliance are investments in your financial future!

What specific aspect of security and compliance would you like to explore?`;
    }

    // Default response for other queries
    return `Oh, that's an interesting question, ${userName}! You know what I love about security? It's like being a guardian angel for your financial life - I can see threats before they become problems and build walls so strong that even the most determined attackers can't get through. Every security measure I implement is peace of mind you can count on.

I'm getting excited just thinking about how we can fortify your financial defenses! Whether you're looking to prevent fraud, ensure compliance, or just understand how to keep your money safe, I'm here to help you create a security fortress that's impenetrable.

What's really on your mind when it comes to security? Are we talking about fraud prevention, data protection, or maybe you're ready to dive deep into some compliance strategies? I'm fired up and ready to help you build whatever security measures you need to sleep soundly at night!`;
  };

  const quickActions = [
    { icon: Shield, text: "Security Check", action: () => sendMessage("I want to check my financial security") },
    { icon: Lock, text: "Compliance Review", action: () => sendMessage("I want to review my compliance status") },
    { icon: AlertTriangle, text: "Fraud Prevention", action: () => sendMessage("I want to prevent fraud") },
    { icon: Eye, text: "Data Protection", action: () => sendMessage("I want to protect my data") },
    { icon: CheckCircle, text: "Security Audit", action: () => sendMessage("I want to audit my security") },
    { icon: Key, text: "Access Control", action: () => sendMessage("I want to control access to my accounts") }
  ];

  const securityStatus = [
    {
      name: "Account Security",
      status: "secure",
      score: "95%",
      icon: CheckCircle
    },
    {
      name: "Data Protection",
      status: "secure",
      score: "92%",
      icon: CheckCircle
    },
    {
      name: "Fraud Prevention",
      status: "secure",
      score: "88%",
      icon: CheckCircle
    },
    {
      name: "Compliance Status",
      status: "warning",
      score: "78%",
      icon: AlertTriangle
    },
    {
      name: "Network Security",
      status: "secure",
      score: "91%",
      icon: CheckCircle
    },
    {
      name: "Device Security",
      status: "secure",
      score: "87%",
      icon: CheckCircle
    }
  ];

  const custodianTips = [
    {
      icon: Shield,
      title: "Multi-Layer Security",
      description: "Use multiple layers of security protection"
    },
    {
      icon: Eye,
      title: "Monitor Regularly",
      description: "Regularly monitor accounts and transactions"
    },
    {
      icon: Lock,
      title: "Strong Authentication",
      description: "Use strong passwords and multi-factor authentication"
    },
    {
      icon: AlertTriangle,
      title: "Stay Informed",
      description: "Keep up with the latest security threats"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 md:mt-8">
        {/* Custodian Header */}
        <div
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">🛡️</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Custodian</h1>
              <p className="text-white/70 text-sm">Security & Compliance AI</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">AI Active</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-2">
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-white/10 px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="text-xl">🛡️</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Custodian</h2>
                    <p className="text-white/60 text-sm">Security & Compliance Specialist</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-60 mt-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div
                    className="flex justify-start"
                  >
                    <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Custodian is analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                    placeholder="Ask Custodian about security, compliance, fraud prevention, or data protection..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Security Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white transition-colors"
                  >
                    <action.icon className="w-5 h-5" />
                    <span className="text-sm">{action.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Security Status */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Security Status</h3>
              <div className="space-y-3">
                {securityStatus.map((item, index) => (
                  <div key={index} className="p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <item.icon className={`w-4 h-4 ${
                          item.status === 'secure' ? 'text-green-400' : 'text-yellow-400'
                        }`} />
                        <span className="text-white text-sm font-medium">{item.name}</span>
                      </div>
                      <span className={`text-sm ${
                        item.status === 'secure' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {item.score}
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          item.status === 'secure' ? 'bg-green-400' : 'bg-yellow-400'
                        }`}
                        style={{ width: item.score }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custodian's Tips */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Custodian's Tips</h3>
              <div className="space-y-3">
                {custodianTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custodian's Stats */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Custodian's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Security Checks</span>
                  <span className="text-emerald-400">156</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Threats Blocked</span>
                  <span className="text-green-400">89</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Compliance Reviews</span>
                  <span className="text-blue-400">47</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Security Score</span>
                  <span className="text-purple-400">92%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
