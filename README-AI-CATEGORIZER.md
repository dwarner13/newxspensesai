# 🤖 AI Transaction Categorizer - Setup Guide

## ✅ What's Included

Your XspensesAI project now includes a complete AI-powered transaction categorization system:

### 🎯 Core Features
- **Smart File Upload**: Drag & drop CSV/TXT files with validation
- **Batch Processing**: Processes 20 transactions at a time to optimize API usage
- **Real-time Progress**: Live progress tracking with batch indicators
- **AI Categorization**: Uses OpenAI GPT-3.5 for intelligent categorization
- **Confidence Scoring**: Shows AI confidence level for each categorization
- **Database Integration**: Save results directly to Supabase
- **Export Options**: Download results as CSV
- **XP Rewards**: Earn XP for using AI features
- **Mobile Responsive**: Works perfectly on all devices

### 🔧 Technical Implementation
- **Error Handling**: Robust fallbacks for API failures
- **Rate Limiting**: Automatic delays between batches
- **Memory Efficient**: Processes large files without memory issues
- **Type Safety**: Full TypeScript implementation
- **Accessibility**: Screen reader friendly with proper ARIA labels

## 🚀 Setup Instructions

### 1. Environment Variables
Add your OpenAI API key to your `.env` file:

```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. Supabase Configuration
Ensure your `transactions` table has these columns:
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to profiles)
- `date` (date)
- `description` (text)
- `amount` (numeric)
- `type` (text: 'Credit' or 'Debit')
- `category` (text)
- `file_name` (text)
- `hash_id` (text, unique)
- `categorization_source` (text: 'ai', 'manual', 'memory')

### 3. OpenAI API Setup
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add billing information (required for API access)
4. Set usage limits to control costs

## 📊 Usage Guide

### For Users
1. **Navigate**: Go to "AI Categorizer" in the sidebar (marked with "New" badge)
2. **Upload**: Drag & drop or select a CSV/TXT file with transaction data
3. **Preview**: Review the file content and row count
4. **Process**: Click "Start AI Categorization" to begin
5. **Monitor**: Watch real-time progress as batches are processed
6. **Review**: Check results with confidence scores
7. **Save**: Save to database or export as CSV

### File Format Examples

#### CSV Format (Recommended)
```csv
Date,Description,Amount
2024-01-15,STARBUCKS COFFEE,5.50
2024-01-16,UBER RIDE,12.30
2024-01-17,ELECTRIC BILL,89.45
```

#### Text Format
```
2024-01-15    STARBUCKS COFFEE    $5.50
2024-01-16    UBER RIDE          $12.30
2024-01-17    ELECTRIC BILL      $89.45
```

## 🎮 Gamification Features

### XP Rewards
- **2 XP** per transaction categorized
- **25 XP** bonus for saving to database
- **Maximum 100 XP** per categorization session

### Activity Tracking
All AI categorization activities are logged in the `xp_activities` table for:
- Progress tracking
- Achievement unlocking
- User engagement analytics

## 🔧 Advanced Configuration

### Batch Size Adjustment
To modify the batch size (default: 20), update the `BATCH_SIZE` constant in:
`src/components/upload/TransactionCategorizer.tsx`

### Category Customization
To modify available categories, update the prompt in:
`src/utils/aiCategorizer.ts`

Current categories:
- Food
- Travel
- Utilities
- Office
- Income
- Shopping
- Healthcare
- Entertainment
- Transportation
- Housing
- Other

### Rate Limiting
Current settings:
- 1 second delay between batches
- 20 transactions per batch
- Automatic retry on rate limit errors

## 🛡️ Error Handling

### API Key Issues
- Clear error messages for missing/invalid keys
- Helpful setup instructions
- Graceful fallbacks

### Rate Limiting
- Automatic detection of rate limits
- User-friendly error messages
- Suggested wait times

### File Processing
- Validation for file types and sizes
- Clear error messages for invalid formats
- Fallback processing for corrupted data

## 📈 Performance Optimization

### Memory Management
- Streaming file processing
- Progressive result display
- Efficient batch handling

### API Optimization
- Minimal token usage
- Optimized prompts
- Intelligent batching

### User Experience
- Real-time progress updates
- Responsive design
- Smooth animations

## 🔍 Troubleshooting

### Common Issues

#### "OpenAI API key not configured"
- Add `VITE_OPENAI_API_KEY` to your `.env` file
- Restart your development server
- Verify the key is valid

#### "Rate limit exceeded"
- Wait a few minutes before retrying
- Consider reducing batch size
- Check your OpenAI usage limits

#### "Failed to parse file"
- Ensure file is in CSV or text format
- Check for proper column headers
- Remove any special characters

#### "Database save failed"
- Verify Supabase connection
- Check table permissions
- Ensure user is authenticated

## 🚀 Production Deployment

### Environment Variables
Ensure these are set in production:
```env
VITE_SUPABASE_URL=your-production-supabase-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_OPENAI_API_KEY=your-production-openai-key
```

### Security Considerations
- API keys are client-side (consider server-side proxy for production)
- Rate limiting is handled by OpenAI
- User data is processed securely through Supabase RLS

### Monitoring
- Track API usage in OpenAI dashboard
- Monitor error rates in application logs
- Set up alerts for failed categorizations

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review console logs for detailed error messages
3. Verify all environment variables are set correctly
4. Test with a small sample file first

## 🎯 Next Steps

Consider these enhancements:
1. **Server-side Processing**: Move AI calls to edge functions for better security
2. **Custom Categories**: Allow users to define their own categories
3. **Learning System**: Implement user feedback to improve categorization
4. **Bulk Operations**: Add bulk editing and correction features
5. **Analytics**: Add categorization accuracy tracking