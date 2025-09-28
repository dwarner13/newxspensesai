# Prime Bot Module

An isolated AI assistant module for XspensesAI that can be developed independently and integrated later.

## 🎯 Purpose

This module provides a complete Prime Bot implementation that is:
- **Isolated** from the main XspensesAI app
- **Mock-based** for easy testing
- **Ready for integration** when development is complete

## 📁 Structure

```
prime-module/
├── components/           # React components
│   └── PrimeChat.tsx    # Main chat interface
├── pages/               # Page components
│   └── PrimeLabPage.tsx # Test lab page
├── services/            # Business logic
│   └── mockAgent.ts     # Mock AI agent
├── hooks/               # Custom React hooks
├── index.ts             # Module exports
└── README.md            # This file
```

## 🚀 Features

- **Chat Interface**: Modern, responsive chat UI
- **Mock Agent**: Simulated AI responses for testing
- **Streaming Support**: Ready for real-time responses
- **Isolation**: Completely separate from main app
- **Type Safety**: Full TypeScript support

## 🧪 Testing

### Enable the Module
```bash
# Set environment variable
VITE_ENABLE_PRIME_MODULE=true
```

### Access the Test Lab
- **URL**: `http://localhost:8888/prime-lab`
- **Features**: Full chat interface with mock responses

### Test Commands
Try these messages to test different response types:
- `"Hello"` - Greeting responses
- `"Help"` - Help information
- `"What can you do?"` - Capabilities overview
- Any other message - Default mock responses

## 🔧 Development

### Adding Features
1. Create components in `components/`
2. Add business logic to `services/`
3. Export from `index.ts`
4. Update routes in main `App.tsx`

### Mock Responses
Edit `services/mockAgent.ts` to customize responses:
- `greeting` - Hello/hi responses
- `help` - Help/capabilities responses  
- `default` - General responses

### Integration Ready
When ready to integrate with real AI:
1. Replace `mockAgent.ts` with real AI service
2. Update API calls in components
3. Remove mock flags and enable production mode

## 🌐 Netlify Function

The module includes a mock Netlify function at `netlify/functions/agent-mock.ts` that provides:
- CORS support
- SSE (Server-Sent Events) streaming
- Mock response generation

## 📋 Next Steps

1. **Test the module** - Visit `/prime-lab` and try the chat
2. **Customize responses** - Edit mock responses as needed
3. **Add features** - Build out the Prime Bot functionality
4. **Integrate** - Connect to real AI services when ready
5. **Deploy** - The module will be included in production builds

## 🔗 Integration

To integrate with the main app:
```typescript
// Import the module
import { PrimeChat, isPrimeEnabled } from '../prime-module';

// Use conditionally
{isPrimeEnabled() && <PrimeChat />}
```

The module is designed to be completely self-contained and can be developed independently of the main XspensesAI application.
