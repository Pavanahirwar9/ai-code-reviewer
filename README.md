# AI Code Reviewer
LIVE DEMO LINK : https://ai-code-review-frontend-j4dp.onrender.com

AI Code Reviewer is a full-stack web application that leverages AI to automatically review code, detect bugs, and provide actionable feedback. It features a modern frontend (Next.js/React) and a robust backend (Node.js/Express/MongoDB) with integration for GitHub and OpenAI.

## Features
- **AI-Powered Code Review:** Upload code or connect your GitHub repo for instant AI analysis.
- **Bug & Issue Detection:** Identifies bugs, security issues, and performance problems.
- **Actionable Suggestions:** Get clear, line-by-line suggestions and explanations.
- **History & Dashboard:** Track past reviews and manage repositories.
- **Authentication:** Secure login with GitHub, Google, or email/password.
- **Modern UI:** Responsive, user-friendly interface with code annotation and issue panels.

## Project Structure
```
backend/   # Node.js/Express API, MongoDB, AI & GitHub integration
frontend/  # Next.js/React frontend, UI components, dashboard
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- MongoDB database (local or cloud)
- OpenAI API key
- GitHub OAuth app credentials (for GitHub login)

### Backend Setup
1. `cd backend`
2. Copy `.env.example` to `.env` and fill in required values
3. Install dependencies: `npm install`
4. Start server: `npm run dev`

### Frontend Setup
1. `cd frontend`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

### Environment Variables
See `backend/.env.example` and `frontend/.env.local` for required variables (API keys, DB URI, etc).

## Deployment
- See `render.yaml` for Render.com deployment configuration.
- Set all required environment variables in your deployment platform.

## License
MIT

---

*

