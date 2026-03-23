import { LegalLayout, H2, H3, P } from "./LegalLayout";

export default function DataProcessingPage() {
  return (
    <LegalLayout title="Data Processing" updated="March 22, 2026">
      <H2>How Your Data Flows Through XspensesAI</H2>
      <P>When you upload a financial document (PDF, CSV, or image), it passes through several processing stages. This page explains exactly what happens at each stage, which third-party services are involved, and how your data is protected throughout.</P>

      <H2>Stage 1: Document Upload and Storage</H2>
      <P>When you upload a document, the file is transmitted to our servers over an encrypted TLS connection. The document is stored in Supabase Storage (hosted on AWS infrastructure) with encryption at rest. Each document is associated with your user account and protected by row-level security, meaning no other user can access your files.</P>

      <H2>Stage 2: Text Extraction (OCR)</H2>
      <H3>Google Cloud Vision API</H3>
      <P>For PDF and image files, the document is sent to Google Cloud Vision API for optical character recognition (OCR). Google processes the image to extract text content — transaction dates, amounts, merchant names, and other text visible in the document. Google's Cloud Vision API processes documents according to Google's Cloud Data Processing Terms. Google does not retain document images after processing is complete. The API call uses encrypted connections and Google's enterprise security infrastructure.</P>
      <H3>Fallback: Anthropic Claude Vision</H3>
      <P>If Google Cloud Vision returns low-confidence results (below 85% confidence), the document may be sent to Anthropic's Claude API as a fallback for higher-quality text extraction. The same data protection standards apply.</P>

      <H2>Stage 3: Transaction Normalization</H2>
      <P>Extracted text is processed by our normalization engine to identify individual transactions, parse dates into standard format, extract monetary amounts, and identify merchant names. This processing occurs on our servers. The normalized transaction data is stored in your Supabase database with row-level security.</P>

      <H2>Stage 4: AI Categorization (Tag)</H2>
      <H3>Anthropic Claude API</H3>
      <P>Transaction data (merchant names, amounts, dates) is sent to Anthropic's Claude API for intelligent categorization. The AI analyzes spending patterns and assigns categories such as Groceries, Transportation, and Subscriptions. Anthropic processes this data according to their Usage Policy. Critically, Anthropic does not use API data to train their models. Your financial data is not used to improve Anthropic's AI systems. All API calls use encrypted connections.</P>

      <H2>Stage 5: Analysis and Insights (Crystal, Prime)</H2>
      <P>Aggregated transaction data and categories are analyzed by our AI agents to generate spending insights, trend detection, financial summaries, and the Xspense Score. Some of this analysis uses Anthropic's Claude API for natural language generation. The same data protection and non-training guarantees apply.</P>

      <H2>Stage 6: Storage and Retrieval</H2>
      <P>All processed data — transactions, categories, summaries, chat messages, scores, and goals — is stored in Supabase PostgreSQL databases with row-level security (RLS). This means database queries are automatically filtered to return only data belonging to the authenticated user. Data is encrypted at rest using AES-256 encryption.</P>

      <H2>Data Residency</H2>
      <P>Supabase infrastructure is hosted on AWS in North American regions. Google Cloud Vision API processing occurs in Google's North American data centers. Anthropic Claude API processing occurs in Anthropic's US-based infrastructure. All data transmission between services uses encrypted connections.</P>

      <H2>What We Do NOT Do</H2>
      <P>We do not use your financial data to train any AI models. We do not share your data with third parties for marketing or advertising. We do not sell your transaction data. We do not store bank login credentials, credit card numbers, or account passwords. We do not retain original uploaded documents indefinitely — documents are processed and transaction data is extracted, with originals available for your reference.</P>

      <H2>Your Control Over Your Data</H2>
      <P>You can export all your data at any time through the Settings page. You can delete all your financial data at any time through the Settings page using the data reset feature. You can delete your entire account, which permanently removes all associated data. You can view exactly what data we have stored about you through the various pages of the application.</P>

      <H2>Contact</H2>
      <P>For questions about our data processing practices, contact us at privacy@xspensesai.com.</P>
    </LegalLayout>
  );
}
