# 🚀 CodeLens AI - AI-Powered Code Review Platform

<div align="center">

![CodeLens AI](https://img.shields.io/badge/CodeLens-AI-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Express](https://img.shields.io/badge/Express-4.18-green?style=for-the-badge&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Ready-green?style=for-the-badge&logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)

**A modern, production-ready AI-powered code review platform that helps developers identify bugs, security vulnerabilities, and performance issues automatically.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation)

</div>

---

## ✨ Features

### 🔍 Core Capabilities
- **🐛 Intelligent Bug Detection** - Automatically identify syntax errors, logic bugs, and runtime issues
- **🔒 Security Scanning** - Detect SQL injection, XSS, insecure dependencies, and hardcoded secrets
- **⚡ Performance Analysis** - Get complexity analysis and optimization suggestions
- **💡 AI-Powered Review** - Leverages GPT-4/OpenAI for intelligent code analysis
- **🔗 GitHub Integration** - Analyze entire repositories, branches, and create PR reviews
- **📊 Detailed Reports** - Comprehensive analysis with severity levels and fix suggestions

### 🎨 Modern UI/UX
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Dark Mode** - Beautiful dark theme with smooth transitions
- **Real-time Feedback** - Instant code analysis results
- **Syntax Highlighting** - Multi-language code editor with themes
- **Interactive Dashboard** - Intuitive navigation and analytics

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js 16 with React19 & App Router
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI, shadcn/ui
- **Icons:** Lucide React
- **Notifications:** Sonner

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
git clone <repository-url>
cd ai-code-review-ui
```

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

**Pricing:** Pay-per-use
- GPT-4: ~$0.03/1K tokens (recommended)
- GPT-3.5-turbo: ~$0.0015/1K tokens (cheaper)

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

## 🎯 Usage Guide

### Analyzing Code

1. **Navigate to Dashboard** - Go to http://localhost:3000/dashboard
2. **Upload Code** - Go to "Code Review" section
3. **Select Method:**
   - Upload a file
   - Paste code directly
   - Connect GitHub repository
4. **Choose Language** - Select your programming language
5. **Analyze** - Click "Analyze Code"
6. **Review Results:**
   - 🐛 Bugs & Errors
   - 🔒 Security Issues
   - ⚡ Performance Suggestions
   - 💡 Best Practices

### GitHub Integration

1. Navigate to "GitHub Integration"
2. Click "Connect GitHub"
3. Authorize the app
4. Select repository and branch
5. Click "Analyze Repository"
6. View comprehensive report

---

## 📖 API Documentation

### Authentication Endpoints

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/update
PUT  /api/auth/password
```

### Code Review Endpoints

```http
POST   /api/review/analyze      # Analyze code snippet
POST   /api/review/file          # Analyze uploaded file
POST   /api/review/repository    # Analyze repository
GET    /api/review/history       # Get review history
GET    /api/review/:id           # Get specific review
DELETE /api/review/:id           # Delete review
```

### GitHub Endpoints

```http
GET  /api/github/repos                    # List repositories
GET  /api/github/repos/:owner/:repo/branches  # List branches
POST /api/github/analyze                  # Analyze repository
POST /api/github/webhook                  # Webhook handler
```

For detailed API documentation, see [backend/README.md](./backend/README.md)

---

## 🏗️ Architecture

### Frontend Architecture
- **App Router** - Next.js 16 App Router for optimal performance
- **Client Components** - Interactive UI components
- **API Client** - Centralized API communication layer
- **Context Providers** - Global state management
- **Custom Hooks** - Reusable logic

### Backend Architecture
- **MVC Pattern** - Models, Controllers, Routes separation
- **Service Layer** - Business logic isolation
- **Middleware** - Authentication, validation, error handling
- **MongoDB** - NoSQL database for flexibility
- **RESTful API** - Standard HTTP methods

### Data Flow
```
User → Frontend (Next.js) → API Client → Backend (Express) → Services (AI/GitHub) → Database (MongoDB)
```

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Frontend Tests
```bash
cd frontend
npm run test
```

### Manual Testing
1. Test user registration and login
2. Upload code for analysis
3. Verify bug detection
4. Test GitHub integration
5. Check responsive design
6. Verify dark mode

---

## 📦 Production Deployment

### Build for Production

```bash
# Build both applications
npm run build:all

# Start in production mode
npm run start:all
```

### Environment Variables for Production

Remember to update:
- `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Update `FRONTEND_URL` and `NEXT_PUBLIC_API_URL`
- Configure production MongoDB URI
- Set up proper CORS origins

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💼 Portfolio & Resume

This project demonstrates:
- ✅ **Full-Stack Development** - Complete frontend and backend implementation
- ✅ **Modern Tech Stack** - Next.js 16, React 19, Express, MongoDB
- ✅ **AI Integration** - OpenAI GPT-4 for intelligent code analysis
- ✅ **Clean Architecture** - Separation of concerns, modular design
- ✅ **Production Ready** - Docker support, comprehensive error handling
- ✅ **Best Practices** - TypeScript, ESLint, security middleware
- ✅ **API Design** - RESTful APIs with proper authentication
- ✅ **UI/UX Excellence** - Modern, responsive, accessible design

Perfect for showcasing in job applications and technical interviews!

---

## 📞 Support

For questions or issues:
- 📧 Email: support@codelens-ai.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/ai-code-review-ui/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/ai-code-review-ui/discussions)

---

<div align="center">

**Built with ❤️ for developers by developers**

[![GitHub stars](https://img.shields.io/github/stars/yourusername/ai-code-review-ui?style=social)](https://github.com/yourusername/ai-code-review-ui)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/ai-code-review-ui?style=social)](https://github.com/yourusername/ai-code-review-ui)

</div>
