# Supabase Setup Guide

## Quick Setup for Real Document Testing

To test with real documents and have them saved to a database, you need to set up a Supabase project.

### Option 1: Use Supabase Cloud (Recommended)

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Sign up/Login and create a new project
   - Choose a region close to you
   - Wait for the project to be ready (2-3 minutes)

2. **Get Your Project Credentials**:
   - Go to Settings → API
   - Copy your Project URL and anon/public key

3. **Create Environment File**:
   Create a `.env` file in your project root with:
   ```
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Set Up Database Tables**:
   Run the SQL from `supabase-migration.sql` in your Supabase SQL editor

### Option 2: Use Local Supabase (Advanced)

1. **Install Supabase CLI**:
   ```bash
   # Windows (using Chocolatey)
   choco install supabase

   # Or download from: https://github.com/supabase/cli/releases
   ```

2. **Start Local Supabase**:
   ```bash
   supabase start
   ```

3. **Create Environment File**:
   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
   ```

### Current Status

Right now, the app is running in **mock mode** which means:
- ✅ Document upload and OCR processing works
- ✅ AI analysis and redaction works  
- ✅ Chat interface works
- ❌ Documents are not saved to database
- ❌ No persistent storage

### Testing Document Upload

Even without Supabase connected, you can test:
1. Click the "Import" button on mobile
2. Upload a receipt or document
3. See the OCR processing and AI analysis
4. Chat with Byte about the document

The document processing will work, but it won't be saved permanently until you connect Supabase.

### Next Steps

1. Set up Supabase (Option 1 is easiest)
2. Create the `.env` file with your credentials
3. Restart your development server
4. Test document upload - it will now save to the database!

## Need Help?

If you need help setting up Supabase, let me know and I can guide you through the process step by step.
