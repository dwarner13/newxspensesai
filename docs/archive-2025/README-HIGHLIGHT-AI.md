# 🔍 Highlighted Text → AI Assistant Feature

## Overview

The Highlighted Text to AI Assistant feature allows users to select any text within the XspensesAI application and get instant AI-powered insights about the selected content. This feature is particularly useful for understanding transaction descriptions, categories, and financial patterns.

## Features

- **Text Selection Detection**: Automatically detects when users highlight text
- **Floating AI Button**: Shows a contextual "Ask AI" button near the highlighted text
- **AI-Powered Analysis**: Provides insights about the selected text
- **Premium Integration**: Available as a premium feature
- **XP Rewards**: Users earn XP for using the feature
- **Mobile Friendly**: Works on all devices

## Technical Implementation

### Components

1. **AskAI.tsx**: The main component that handles text selection, AI requests, and response display
2. **AskAIHighlight.tsx**: A specialized version focused on transaction highlights

### How It Works

1. **Text Selection Detection**:
   ```javascript
   document.addEventListener("mouseup", () => {
     const selection = window.getSelection();
     const text = selection?.toString().trim();
     
     if (text && text.length > 2) {
       // Show AI button near selection
       const rect = selection?.getRangeAt(0).getBoundingClientRect();
       setPosition({ 
         top: rect.bottom + window.scrollY + 8, 
         left: rect.left + window.scrollX 
       });
       setShowTooltip(true);
     }
   });
   ```

2. **AI Processing**:
   ```javascript
   const prompt = `You are a financial AI assistant analyzing highlighted text: "${highlightedText}"

   Respond with:
   1. What this likely refers to (e.g., vendor, category, description)
   2. Which category it most likely fits under
   3. One tip or insight based on it`;

   const response = await fetch("https://api.openai.com/v1/chat/completions", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${openAIKey}`,
     },
     body: JSON.stringify({
       model: "gpt-3.5-turbo",
       messages: [{ role: "user", content: prompt }],
       temperature: 0.7,
       max_tokens: 150,
     }),
   });
   ```

3. **XP Rewards**:
   ```javascript
   // Award XP for using the feature
   await supabase
     .from('xp_activities')
     .insert({
       user_id: user.id,
       activity_type: 'ai_highlight',
       xp_earned: 1,
       description: 'Used AI highlight feature'
     });
   ```

## Usage Examples

### Transaction Descriptions

When a user highlights a transaction description like "UBER EATS DELIVERY", the AI might respond:

```
This appears to be a food delivery service, specifically Uber Eats.

This transaction would best fit under the Food category, as it represents a meal delivery service.

Tip: Food delivery services often include service fees and delivery charges. Consider comparing the total cost to cooking at home to identify potential savings.
```

### Vendor Names

When highlighting a vendor name like "AMZN Mktp US", the AI might respond:

```
This refers to Amazon Marketplace US, an online shopping platform.

This transaction would best fit under the Shopping category, as it represents a purchase from an e-commerce retailer.

Tip: Amazon purchases can span multiple categories. Consider using subcategories or notes to track what types of items you're purchasing most frequently from Amazon.
```

### Category Names

When highlighting a category like "Entertainment", the AI might respond:

```
Entertainment refers to spending on leisure activities and media consumption.

This category typically includes expenses like streaming services, movie tickets, concerts, and recreational activities.

Tip: Entertainment spending is often a good area to review when budgeting. Consider setting a monthly entertainment budget and tracking it to ensure discretionary spending stays in check.
```

## Premium Integration

This feature is integrated with the premium subscription model:

- **Free Users**: See a premium upgrade prompt when they try to use the feature
- **Premium Users**: Get full access to AI insights
- **Admin Users**: Have unlimited access to the feature

## XP System Integration

Users earn XP for using the highlight feature:

- **+1 XP**: Each time a user gets an AI insight from highlighted text
- **Activity Tracking**: All usage is logged in the `xp_activities` table
- **Progress Contribution**: Contributes to level progression and streaks

## Mobile Optimization

The feature is optimized for mobile use:

- **Touch Selection**: Works with touch-based text selection
- **Responsive Positioning**: AI button and response adapt to screen size
- **Touch-Friendly UI**: Larger touch targets on mobile devices

## Error Handling

The feature includes robust error handling:

- **API Key Validation**: Checks for valid OpenAI API key
- **Rate Limiting**: Handles OpenAI rate limits gracefully
- **Fallback Responses**: Provides helpful messages if AI is unavailable
- **Network Issues**: Handles connection problems with user-friendly errors

## Security Considerations

- **API Key Protection**: OpenAI key is stored in environment variables
- **User Authentication**: Feature only available to logged-in users
- **Premium Validation**: Server-side validation of premium status
- **Data Privacy**: No user data is stored by OpenAI

## Future Enhancements

Potential future improvements include:

1. **Learning System**: Remember user preferences based on highlighted text
2. **Bulk Actions**: Apply AI suggestions to multiple similar transactions
3. **Custom Categories**: Suggest custom categories based on user's existing system
4. **Financial Insights**: Deeper analysis of spending patterns in highlighted text
5. **Voice Integration**: Read AI insights aloud for accessibility