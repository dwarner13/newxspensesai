# 🚀 GitHub Setup Guide for Podcast Pipeline

This guide will help you set up the Personal Financial Podcast Pipeline on GitHub with proper CI/CD, issue tracking, and project management.

## 📋 Prerequisites

- GitHub account with repository access
- Node.js 18+ installed
- Python 3.11+ installed
- Supabase CLI installed
- Vercel account (for deployment)

## 🏗️ Repository Setup

### 1. Create Repository Structure

```bash
# Clone the repository
git clone https://github.com/your-username/xspenses-ai.git
cd xspenses-ai

# Create podcast-specific directories
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE
mkdir -p docs/podcast
mkdir -p tests/podcast
```

### 2. Initialize Git Hooks

```bash
# Install husky for git hooks
npm install --save-dev husky lint-staged

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

# Add commit-msg hook for conventional commits
npx husky add .husky/commit-msg "npx --no -- commitlint --edit \$1"
```

### 3. Configure Lint Staged

Add to `package.json`:
```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "src/**/*.{js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## 🔧 GitHub Repository Settings

### 1. Repository Settings

Go to your repository settings and configure:

#### General Settings
- **Repository name**: `xspenses-ai`
- **Description**: `AI-powered personal finance management with personalized podcast generation`
- **Topics**: `ai, finance, podcast, typescript, react, supabase, python`
- **Visibility**: Private (recommended for production)

#### Features
- ✅ **Issues**: Enable
- ✅ **Pull requests**: Enable
- ✅ **Wikis**: Enable
- ✅ **Discussions**: Enable
- ✅ **Projects**: Enable
- ✅ **Actions**: Enable

### 2. Branch Protection Rules

Create branch protection for `main` and `develop`:

#### Main Branch Protection
- ✅ **Require a pull request before merging**
- ✅ **Require approvals**: 2 reviewers
- ✅ **Dismiss stale PR approvals when new commits are pushed**
- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**
- ✅ **Include administrators**
- ✅ **Restrict pushes that create files that use the gitattributes pattern**

#### Develop Branch Protection
- ✅ **Require a pull request before merging**
- ✅ **Require approvals**: 1 reviewer
- ✅ **Require status checks to pass before merging**
- ✅ **Include administrators**

### 3. Issue Templates

The podcast-specific issue template is already created at `.github/ISSUE_TEMPLATE/podcast-feature.md`.

### 4. Pull Request Template

The PR template is already created at `.github/pull_request_template.md`.

## 🔐 GitHub Secrets Configuration

### 1. Required Secrets

Go to **Settings > Secrets and variables > Actions** and add:

#### Supabase Secrets
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Frontend Environment Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Audio Processing APIs
```
ELEVENLABS_API_KEY=your-elevenlabs-key
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=your-azure-region
```

#### AI Processing APIs
```
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

#### Deployment Secrets
```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

#### Notification Secrets
```
SLACK_WEBHOOK_URL=your-slack-webhook-url
DISCORD_WEBHOOK_URL=your-discord-webhook-url
```

### 2. Repository Variables

Add repository variables for non-sensitive data:

```
NODE_VERSION=18
PYTHON_VERSION=3.11
SUPABASE_CLI_VERSION=latest
```

## 🏷️ GitHub Labels Setup

### 1. Create Podcast-Specific Labels

Go to **Issues > Labels** and create:

#### Priority Labels
- `priority-critical` - 🔴 Critical issues
- `priority-high` - 🟡 High priority
- `priority-medium` - 🟢 Medium priority
- `priority-low` - 🔵 Low priority

#### Component Labels
- `podcast-pipeline` - 🎙️ Podcast pipeline
- `frontend` - ⚛️ Frontend issues
- `backend` - 🐍 Backend issues
- `database` - 🗄️ Database issues
- `audio-processing` - 🔊 Audio processing
- `ai-generation` - 🤖 AI content generation

#### Type Labels
- `bug` - 🐛 Bug reports
- `enhancement` - ✨ Feature requests
- `documentation` - 📚 Documentation
- `testing` - 🧪 Testing
- `performance` - 🚀 Performance
- `security` - 🔒 Security

#### Status Labels
- `in-progress` - 🔄 Work in progress
- `blocked` - 🚫 Blocked
- `ready-for-review` - 👀 Ready for review
- `needs-feedback` - 💬 Needs feedback

## 📊 GitHub Projects Setup

### 1. Create Podcast Pipeline Project

1. Go to **Projects** tab
2. Click **New project**
3. Choose **Board** template
4. Name: `Podcast Pipeline Development`

### 2. Configure Project Board

#### Columns
- **Backlog** - New issues and ideas
- **To Do** - Ready to work on
- **In Progress** - Currently being worked on
- **Review** - Ready for code review
- **Testing** - In testing phase
- **Done** - Completed and deployed

#### Automation
- **New issues** → **Backlog**
- **Pull requests opened** → **In Progress**
- **Pull requests merged** → **Done**

## 🔄 GitHub Actions Workflow

The podcast pipeline workflow is already configured at `.github/workflows/podcast-pipeline.yml`.

### Workflow Features
- **Path-based triggers** - Only runs on podcast-related changes
- **Parallel testing** - Frontend, backend, and database tests run simultaneously
- **Caching** - Node modules and Python dependencies cached
- **Coverage reporting** - Code coverage uploaded to Codecov
- **Deployment** - Automatic deployment to staging and production
- **Notifications** - Slack notifications for deployment status

## 📝 Commit Message Convention

### Conventional Commits

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

#### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

#### Scopes
- `podcast` - Podcast pipeline
- `frontend` - Frontend changes
- `backend` - Backend changes
- `database` - Database changes
- `audio` - Audio processing
- `ai` - AI generation

#### Examples
```
feat(podcast): add new podcaster personality Roast
fix(audio): resolve audio playback issues
docs(podcast): update API documentation
test(podcast): add unit tests for preferences panel
```

## 🧪 Testing Setup

### 1. Frontend Testing

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest

# Run podcast-specific tests
npm test -- --testPathPattern="podcast"

# Run with coverage
npm test -- --testPathPattern="podcast" --coverage
```

### 2. Backend Testing

```bash
# Install Python testing dependencies
cd ai-backend
pip install pytest pytest-cov pytest-asyncio

# Run podcast tests
python -m pytest tests/test_podcast.py -v

# Run with coverage
python -m pytest tests/test_podcast.py --cov=podcast_generator --cov-report=html
```

### 3. Integration Testing

```bash
# Run end-to-end tests
npm run test:e2e -- --spec "podcast/**/*.spec.ts"
```

## 📈 Monitoring and Analytics

### 1. Code Coverage

- **Codecov** integration for coverage reporting
- **SonarCloud** for code quality analysis
- **Bundle analyzer** for frontend bundle size

### 2. Performance Monitoring

- **Lighthouse CI** for performance metrics
- **Web Vitals** tracking
- **Error tracking** with Sentry

### 3. Analytics

- **Google Analytics** for user behavior
- **Mixpanel** for feature usage
- **Custom podcast analytics** dashboard

## 🔒 Security Setup

### 1. Security Scanning

```yaml
# Add to workflow
- name: Security scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
```

### 2. Dependency Scanning

```yaml
# Add to workflow
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    format: 'sarif'
    output: 'trivy-results.sarif'
```

### 3. Secret Scanning

Enable GitHub's built-in secret scanning:
- Go to **Settings > Security**
- Enable **Secret scanning**
- Enable **Dependency graph**

## 📚 Documentation

### 1. Wiki Setup

Create wiki pages:
- **Getting Started** - Setup instructions
- **API Documentation** - Podcast API endpoints
- **Architecture** - System design
- **Troubleshooting** - Common issues

### 2. README Files

- `README_PODCAST_PIPELINE.md` - Main podcast documentation
- `CHANGELOG_PODCAST.md` - Version history
- `API_DOCUMENTATION.md` - API reference

## 🚀 Deployment Setup

### 1. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Link to Vercel project
vercel link

# Deploy
vercel --prod
```

### 2. Environment Variables

Set environment variables in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ELEVENLABS_API_KEY`
- `AZURE_SPEECH_KEY`

### 3. Custom Domains

Configure custom domains in Vercel:
- `podcast.yourdomain.com`
- `api.yourdomain.com`

## 🤝 Contributing Guidelines

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/your-username/xspenses-ai.git
cd xspenses-ai

# Add upstream remote
git remote add upstream https://github.com/original-owner/xspenses-ai.git
```

### 2. Development Workflow

```bash
# Create feature branch
git checkout -b feature/podcast-enhancement

# Make changes
# Test changes
npm test
npm run build

# Commit with conventional commit
git commit -m "feat(podcast): add new podcaster personality"

# Push to your fork
git push origin feature/podcast-enhancement

# Create pull request
```

### 3. Pull Request Process

1. **Create PR** with descriptive title
2. **Fill out PR template** completely
3. **Add reviewers** from podcast team
4. **Link related issues** using keywords
5. **Add appropriate labels**
6. **Wait for CI checks** to pass
7. **Address review feedback**
8. **Merge when approved**

## 📞 Support and Communication

### 1. GitHub Discussions

Create discussion categories:
- **General** - General questions
- **Ideas** - Feature suggestions
- **Q&A** - Technical questions
- **Show and tell** - User showcases

### 2. Issue Templates

Use the podcast-specific issue template for:
- Bug reports
- Feature requests
- Documentation updates
- Testing issues

### 3. Slack Integration

Configure Slack notifications for:
- New issues
- Pull request updates
- Deployment status
- Build failures

## 🎯 Best Practices

### 1. Code Quality

- **ESLint** and **Prettier** for code formatting
- **TypeScript** for type safety
- **Pre-commit hooks** for quality checks
- **Code review** for all changes

### 2. Testing

- **Unit tests** for all components
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Coverage thresholds** (80% minimum)

### 3. Documentation

- **Inline comments** for complex logic
- **API documentation** with examples
- **README files** for each component
- **Changelog** for version history

### 4. Security

- **Dependency updates** automated
- **Security scanning** in CI/CD
- **Secret management** with GitHub Secrets
- **Access control** with branch protection

---

## 🎉 Next Steps

1. **Set up repository** with all configurations
2. **Configure secrets** and environment variables
3. **Set up monitoring** and analytics
4. **Create first issue** using the podcast template
5. **Start development** with the established workflow

*Happy coding! 🎙️✨*
