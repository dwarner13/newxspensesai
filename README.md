# XspensesAI - AI-Powered Expense Tracking

Master your expenses with AI-powered financial tracking. Earn XP and win at money with smart categorization and insights.

## 🚀 Features

- **AI-Powered PDF Processing**: Upload PDF bank statements and let AI extract transactions automatically
- **Smart Categorization**: Automatic transaction categorization with learning capabilities
- **CSV Import**: Quick import of CSV bank statements
- **Interactive Dashboard**: Beautiful charts and financial insights
- **Real-time Chat**: Ask questions about your finances with AI assistant
- **Secure Authentication**: Google OAuth integration
- **Export Capabilities**: Export data as PDF or CSV

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (Database, Auth, Storage, Edge Functions)
- **AI**: OpenAI GPT-3.5 for transaction categorization and chat
- **Charts**: Chart.js with React integration
- **Animations**: Framer Motion
- **Icons**: Lucide React

## 🔧 Environment Setup

Create a `.env` file with the following variables:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_OPENAI_API_KEY=your-openai-api-key
```

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔐 Authentication Setup

1. **Supabase Configuration**:
   - Enable Google OAuth in Supabase Auth settings
   - Add your domain to allowed redirect URLs
   - Set Site URL to your production domain

2. **Google OAuth Setup**:
   - Create a Google Cloud project
   - Enable Google+ API
   - Add authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
     - `https://yourdomain.com/auth/callback`

## 🗄️ Database Schema

The application uses the following main tables:

- `transactions`: Store financial transactions
- `categorization_rules`: AI learning for transaction categorization
- `memory`: User-specific categorization memory
- `files`: Uploaded file metadata
- `exports`: Export history

## 🚀 Deployment

The application is configured for Netlify deployment:

1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

## 🔍 Features Overview

### AI-Powered PDF Processing
- Upload PDF bank statements
- AI extracts transaction data automatically
- Handles various bank statement formats

### Smart Categorization
- Learns from user corrections
- Automatic categorization of new transactions
- Memory-based rule system

### Interactive Dashboard
- Financial overview with charts
- Monthly breakdowns
- Category analysis
- Export capabilities

### Chat Assistant
- Ask questions about your finances
- Get insights from your transaction data
- Powered by OpenAI GPT-3.5

## 🛡️ Security

- Secure authentication with Supabase
- Row Level Security (RLS) on all tables
- Encrypted file storage
- HTTPS everywhere

## 📱 Mobile Responsive

Fully responsive design that works on:
- Desktop computers
- Tablets
- Mobile phones

## 🎨 Design System

- Modern, clean interface
- Consistent color palette
- Smooth animations
- Accessible design

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts (Auth, etc.)
├── lib/           # Utility libraries (Supabase client)
├── pages/         # Page components
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── main.tsx       # Application entry point
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact [support@xspensesai.com](mailto:support@xspensesai.com)

---

**XspensesAI** - Master your expenses. Earn XP. Win at money. 🎯