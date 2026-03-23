import { LegalLayout, H2, H3, P } from "./LegalLayout";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="March 22, 2026">
      <H2>1. Introduction and PIPEDA Compliance</H2>
      <P>XspensesAI is committed to protecting the privacy of our users in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial privacy legislation. This Privacy Policy explains what information we collect, how we use it, and the choices you have regarding your data.</P>

      <H2>2. Information We Collect</H2>
      <H3>Information You Provide</H3>
      <P>When you create an account, we collect your email address, display name, and any profile information you choose to provide (such as primary financial mode, currency preference, and financial priorities). When you upload financial documents, we collect the transaction data extracted from those documents, including transaction amounts, dates, merchant names, and categories.</P>
      <H3>Information Generated Through Use</H3>
      <P>We collect and store chat messages you exchange with our AI agents, your financial categorization preferences and rules, goal and debt tracking information you enter, and your Xspense Score history. We also collect basic usage analytics such as feature usage patterns and session information.</P>
      <H3>Information We Do NOT Collect</H3>
      <P>We do not collect or store bank login credentials or passwords, credit card numbers, Social Insurance Numbers (SIN) or Social Security Numbers (SSN), or investment account credentials. We process uploaded document images for text extraction only and do not store raw financial account access information.</P>

      <H2>3. How We Use Your Information</H2>
      <P>We use your information to provide the core Service: extracting transaction data from uploaded documents, categorizing transactions, generating financial insights and analysis, calculating your Xspense Score, facilitating conversations with AI agents, and generating reports. We do not use your personal financial data for any purpose other than providing and improving the Service.</P>

      <H2>4. Data Processing Partners</H2>
      <P>To provide the Service, we share certain data with the following third-party processors:</P>
      <P><strong>Supabase</strong> (database and storage): All user data is stored in Supabase-hosted PostgreSQL databases with row-level security. Data is encrypted at rest and in transit. Supabase infrastructure is hosted on AWS.</P>
      <P><strong>Google Cloud Vision API</strong> (OCR): Uploaded document images are sent to Google Cloud Vision for text extraction. Google processes these images according to their Cloud Data Processing Terms. Images are not retained by Google after processing.</P>
      <P><strong>Anthropic Claude API</strong> (AI analysis): Extracted transaction text and user messages are sent to Anthropic's Claude API for categorization, analysis, and conversation. Anthropic processes this data according to their Usage Policy. Anthropic does not use API data to train their models.</P>

      <H2>5. Data Sharing</H2>
      <P>We do not sell, rent, or share your personal data with third parties for marketing or advertising purposes. Data is shared with our processing partners only as necessary to provide the Service, as described above. We may disclose information if required by law, court order, or governmental regulation.</P>

      <H2>6. Data Security</H2>
      <P>We implement industry-standard security measures including: encryption in transit using TLS 1.2+, encryption at rest for all stored data, row-level security (RLS) in our database ensuring users can only access their own data, PII detection and masking in AI processing pipelines (guardrails), and secure authentication via Supabase Auth with support for OAuth providers.</P>

      <H2>7. Data Retention and Deletion</H2>
      <P>Your data is retained for as long as your account is active. You may delete all your financial data at any time through Settings, Data and Privacy, using the data reset feature. You may delete your entire account, which permanently removes all associated data from our systems. Upon deletion, data is removed from our primary databases. Backup retention follows standard infrastructure provider policies (typically 30 days).</P>

      <H2>8. Your Rights</H2>
      <P>Under PIPEDA and applicable privacy laws, you have the right to: access your personal information (available through the Service's interface and export features), request correction of inaccurate information, request deletion of your data, receive your data in a portable format (CSV export), and withdraw consent for data processing (by deleting your account).</P>

      <H2>9. Cookies</H2>
      <P>We use session cookies for authentication purposes only. We do not use tracking cookies, advertising cookies, or third-party analytics cookies. Our session cookies are essential for the Service to function and cannot be disabled while using the Service.</P>

      <H2>10. Children's Privacy</H2>
      <P>XspensesAI is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 18, we will take steps to delete that information.</P>

      <H2>11. Changes to This Policy</H2>
      <P>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. We encourage you to review this policy periodically.</P>

      <H2>12. Contact</H2>
      <P>For privacy inquiries, data access requests, or concerns about your personal information, contact us at privacy@xspensesai.com.</P>
    </LegalLayout>
  );
}
