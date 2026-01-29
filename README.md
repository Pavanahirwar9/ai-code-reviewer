# 🚀 CodeLens AI - AI-Powered Code Review Platform


**A modern, production-ready AI-powered code review platform that helps developers identify bugs, security vulnerabilities, and performance issues automatically.**



---

## 📖 About This Project

**CodeLens AI** is a comprehensive, production-ready AI-powered code review platform designed to help developers write better, more secure code. Built with modern technologies including Next.js 16, React 19, Express.js, and MongoDB, this platform leverages OpenAI's GPT-4 to provide intelligent code analysis.

### 🎯 What It Does

- **Analyzes Code Quality:** Upload code snippets or entire files to get instant feedback on code quality, bugs, and potential issues
- **Detects Security Vulnerabilities:** Identifies common security issues like SQL injection, XSS, hardcoded secrets, and insecure dependencies
- **Performance Optimization:** Provides suggestions for improving code performance and reducing complexity
- **GitHub Integration:** Connect your GitHub account to analyze entire repositories and branches
- **Multi-Language Support:** Supports JavaScript, TypeScript, Python, Java, C++, and many more programming languages
- **Detailed Reports:** Generates comprehensive reports with severity levels, line numbers, and fix suggestions

### 💡 Who Is This For?

- **Individual Developers:** Get instant code reviews without waiting for peer reviews
- **Teams:** Standardize code quality across your organization
- **Students:** Learn best practices by analyzing your code
- **Job Seekers:** Showcase a full-stack project with modern tech stack in your portfolio
- **Interviewers:** Use as a reference for discussing system design and architecture


## ✨ Features

### 🔍 Core Capabilities
- **🐛 Intelligent Bug Detection** - Automatically identify syntax errors, logic bugs, and runtime issues
- **🔒 Security Scanning** - Detect SQL injection, XSS, insecure dependencies, and hardcoded secrets
- **⚡ Performance Analysis** - Get complexity analysis and optimization suggestions
- **💡 AI-Powered Review** - Leverages GPT-4/OpenAI for intelligent code analysis
- **🔗 GitHub Integration** - Analyze entire repositories, branches, and create PR reviews
- **📊 Detailed Reports** - Comprehensive analysis with severity levels and fix suggestions



### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js 4
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT + bcrypt
- **AI Integration:** OpenAI GPT-4
- **Code Analysis:** ESLint
- **Security:** Helmet, CORS, Rate Limiting

---

## 📁 Project Structure

```
ai-code-review-ui/
├── frontend/                    # Next.js Frontend Application
│   ├── src/
│   │   ├── app/                # Next.js pages (App Router)
│   │   │   ├── dashboard/      # Dashboard pages
│   │   │   ├── login/          # Authentication pages
│   │   │   ├── register/
│   │   │   ├── layout.tsx      # Root layout
│   │   │   ├── page.tsx        # Landing page
│   │   │   └── globals.css     # Global styles
│   │   ├── components/         # React components
│   │   │   ├── ui/             # Reusable UI components
│   │   │   └── theme-provider.tsx
│   │   ├── contexts/           # React contexts
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities and API client
│   │   └── types/              # TypeScript types
│   ├── public/                 # Static assets
│   ├── .env.local              # Frontend config
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.mjs
│
├── backend/                     # Express.js Backend API
│   ├── src/
│   │   ├── config/             # Configuration files
│   │   │   └── db.js           # MongoDB connection
│   │   ├── controllers/        # Route controllers
│   │   │   ├── auth.controller.js
│   │   │   ├── github.controller.js
│   │   │   └── review.controller.js
│   │   ├── middleware/         # Express middleware
│   │   │   ├── auth.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   └── validate.middleware.js
│   │   ├── models/             # MongoDB models
│   │   │   ├── User.model.js
│   │   │   └── Review.model.js
│   │   ├── routes/             # API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── github.routes.js
│   │   │   ├── review.routes.js
│   │   │   └── user.routes.js
│   │   ├── services/           # Business logic
│   │   │   ├── ai.service.js   # OpenAI integration
│   │   │   ├── github.service.js
│   │   │   └── eslint.service.js
│   │   ├── utils/              # Utility functions
│   │   │   ├── logger.js
│   │   │   └── responseHandler.js
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Server entry point
│   ├── uploads/                # File uploads
│   ├── logs/                   # Application logs
│   ├── .env                    # Backend config
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
│
├── package.json                # Root scripts (monorepo)
├── README.md                   # This file
└── .gitignore

```

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:
- **Node.js** v18.0.0 or higher
- **npm** or **pnpm** (latest version)
- **MongoDB** (optional - can run in demo mode without it)
- **Git** for cloning

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-code-review-ui.git
cd ai-code-review-ui
```

> **Note:** Replace `YOUR_USERNAME` with your GitHub username after uploading this project.

#### 2. Install Dependencies

```bash
# Install root dependencies (concurrently for running both servers)
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
cd ..
```

#### 3. Configure Environment Variables

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=CodeLens AI
```

**Backend** (`backend/.env`):
```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database (optional - comment out to run without MongoDB)
# MONGODB_URI=mongodb://localhost:27017/ai-code-review

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# OpenAI API (required for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 4. Run the Application

**Option 1: Run both servers simultaneously** (Recommended)
```bash
npm run dev
```

**Option 2: Run servers separately**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

#### 5. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **API Health Check:** http://localhost:5000/health

---

## 🔑 Getting API Keys

### OpenAI API Key (Required for AI Features)

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key (starts with `sk-...`)
6. Add to `backend/.env` as `OPENAI_API_KEY`



### GitHub OAuth (Optional - For Repository Integration)

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Name:** CodeLens AI
   - **Homepage URL:** `http://localhost:3000`
   - **Callback URL:** `http://localhost:3000/dashboard/github`
4. Click "Register application"
5. Copy Client ID and generate Client Secret
6. Add to `backend/.env`

---


