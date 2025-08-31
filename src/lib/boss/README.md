# AI Boss Component

## Setup

1. **Environment Variable**: Add your OpenAI API key to your `.env` file:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Usage**: The AI Boss component is now integrated into the main dashboard and will appear above the "Personal Finance AI" section.

## Features

- **Intent Routing**: Automatically routes users to the appropriate AI employee based on their query
- **Deep Linking**: Uses React Router navigation to take users directly to the relevant dashboard page
- **Contextual Responses**: Provides personalized guidance based on user intent
- **Example Queries**: Pre-built examples to help users get started

## Intent Mapping

- `import_document` → `/dashboard/smart-import-ai`
- `financial_assistant_qna` → `/dashboard/ai-financial-assistant`
- `financial_therapy` → `/dashboard/financial-therapist`
- `goal_concierge` → `/dashboard/goal-concierge`
- `spending_predictions` → `/dashboard/spending-predictions`
- `help_nav` → Stays on dashboard with guidance

## Testing

Use these example queries to test the routing:

- "How do I import a PDF?" → Should route to Smart Import AI
- "Who helps with anxiety about money?" → Should suggest Financial Therapist
- "Forecast next month spend" → Should suggest Spending Predictions
- "How do I use XspensesAI?" → Should give overview with buttons to each employee
