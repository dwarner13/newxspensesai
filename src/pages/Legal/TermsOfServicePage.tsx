import { LegalLayout, H2, H3, P } from "./LegalLayout";

export default function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" updated="March 22, 2026">
      <H2>1. Acceptance of Terms</H2>
      <P>By accessing or using XspensesAI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. You must be at least 18 years of age to use XspensesAI.</P>

      <H2>2. Nature of the Service</H2>
      <P>XspensesAI is a financial organization and tracking tool powered by artificial intelligence. The Service is designed to help you organize, categorize, and understand your financial transactions. XspensesAI is NOT a licensed financial advisor, tax professional, accountant, or legal advisor. All AI-generated categorizations, insights, summaries, scores, and recommendations are informational only and do not constitute professional financial, tax, investment, or legal advice.</P>
      <P>You must consult a licensed professional — such as a Certified Public Accountant (CPA), Chartered Professional Accountant, licensed financial advisor, or qualified tax professional — before making financial decisions based on information provided by the Service.</P>

      <H2>3. AI Agents and Automated Processing</H2>
      <P>XspensesAI uses multiple AI agents (Prime, Byte, Tag, Crystal, Goalie, and Ledger) to process your financial data. These agents are software tools that use machine learning and natural language processing to provide their respective services. They are not human professionals and their outputs should be treated as automated suggestions, not professional advice.</P>

      <H2>4. Limitation of Liability</H2>
      <P>XspensesAI and its operators shall not be held responsible for: errors in OCR (Optical Character Recognition) text extraction from uploaded documents; miscategorized transactions; incorrect identification of tax deductions or business expenses; outcomes resulting from AI-generated advice, insights, or recommendations; financial losses arising from decisions made based on the Service's outputs; or interruptions in service availability.</P>
      <P>To the maximum extent permitted by law, our total liability for any claims arising from your use of the Service shall not exceed the total fees you have paid to XspensesAI in the twelve (12) months preceding the claim.</P>

      <H2>5. No Warranty</H2>
      <P>The Service is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, accuracy, or non-infringement.</P>

      <H2>6. Data Processing and Third Parties</H2>
      <P>By uploading financial documents to XspensesAI, you grant us permission to process those documents through our service infrastructure, which includes third-party data processors: Supabase (database and storage), Google Cloud Vision API (optical character recognition), and Anthropic Claude API (AI analysis and conversation). Your data is shared with these processors only as necessary to provide the Service.</P>
      <P>We process statement data only — specifically transaction amounts, dates, merchant names, and categories. We do not store or transmit credit card numbers, bank account login credentials, Social Insurance Numbers (SIN), Social Security Numbers (SSN), or banking passwords.</P>

      <H2>7. User Responsibilities</H2>
      <P>You are responsible for the accuracy and legality of all documents and data you upload to the Service. You represent that you have the right to upload and process any financial documents you provide. You are solely responsible for all financial decisions you make, regardless of any information provided by the Service.</P>

      <H2>8. Account Termination</H2>
      <P>We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion. You may delete your account and all associated data at any time through the Settings page. Upon account deletion, all your financial data, transaction records, chat history, and uploaded documents will be permanently removed from our systems.</P>

      <H2>9. Intellectual Property</H2>
      <P>The Service, including all AI agent personalities, the Xspense Score algorithm, user interface designs, and associated content, is the intellectual property of XspensesAI. You retain ownership of all financial data you upload to the Service.</P>

      <H2>10. Modification of Terms</H2>
      <P>We may update these Terms of Service from time to time. We will provide at least thirty (30) days notice of material changes by posting the updated terms on this page and updating the "Last updated" date. Continued use of the Service after changes take effect constitutes acceptance of the modified terms.</P>

      <H2>11. Governing Law</H2>
      <P>These Terms of Service shall be governed by and construed in accordance with the laws of the Province of Alberta, Canada, without regard to its conflict of law provisions. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Alberta, Canada.</P>

      <H2>12. Contact</H2>
      <P>For questions about these Terms of Service, contact us at legal@xspensesai.com.</P>
    </LegalLayout>
  );
}
