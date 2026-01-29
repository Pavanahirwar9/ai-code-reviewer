  # AI Code Review Backend API

Production-ready Node.js + Express + MongoDB backend for AI-powered code review and bug detection.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 4.4+
- OpenAI API Key

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env

# Start MongoDB (if running locally)
mongod

# Run in development
npm run dev

# Run in production
npm start
```

### With Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## 📁 Project Structure

```
backend/
├── config/               # Configuration files
│   ├── db.js            # MongoDB connection
│   ├── openai.js        # OpenAI client
│   └── github.js        # GitHub OAuth config
├── controllers/          # Request handlers
│   ├── auth.controller.js
│   ├── review.controller.js
│   ├── github.controller.js
│   └── user.controller.js
├── middleware/           # Custom middleware
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   ├── upload.middleware.js
│   └── rateLimit.middleware.js
├── models/               # Mongoose models
│   ├── User.model.js
│   ├── Review.model.js
│   ├── Repo.model.js
│   └── Session.model.js
├── routes/               # API routes
│   ├── auth.routes.js
│   ├── review.routes.js
│   ├── github.routes.js
│   └── user.routes.js
├── services/             # Business logic
│   ├── ai.service.js
│   ├── lint.service.js
│   ├── github.service.js
│   ├── file.service.js
│   └── report.service.js
├── utils/                # Utility functions
│   ├── logger.js
│   ├── languageDetector.js
│   ├── validators.js
│   └── responseHandler.js
├── uploads/              # Uploaded files
├── app.js                # Express app
└── server.js             # Server entry point
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update` - Update profile
- `PUT /api/auth/password` - Update password

### Code Review
- `POST /api/review/text` - Analyze code from text
- `POST /api/review/upload` - Analyze uploaded file
- `GET /api/review/history` - Get analysis history
- `GET /api/review/:id` - Get specific review
- `GET /api/review/:id/download` - Download report
- `DELETE /api/review/:id` - Delete review
- `GET /api/review/stats` - Get user statistics

### GitHub Integration
- `GET /api/github/auth` - Start OAuth flow
- `GET /api/github/callback` - OAuth callback
- `GET /api/github/repos` - Get user repositories
- `GET /api/github/repos/:owner/:repo/branches` - Get branches
- `POST /api/github/analyze` - Analyze GitHub file
- `GET /api/github/status` - Check connection status
- `DELETE /api/github/disconnect` - Disconnect GitHub

### User
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/dashboard` - Get dashboard data
- `DELETE /api/user/account` - Delete account

## 🔐 Authentication

All API requests (except auth and GitHub callback) require a JWT token in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

## 📝 Example Requests

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Analyze Code
```bash
curl -X POST http://localhost:5000/api/review/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "code": "function hello() { console.log(\"Hello\") }",
    "language": "javascript",
    "fileName": "hello.js"
  }'
```

### Upload File
```bash
curl -X POST http://localhost:5000/api/review/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/code.js"
```

## ⚙️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment (development/production) | No |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRE` | Token expiration | No (default: 7d) |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `OPENAI_MODEL` | OpenAI model (gpt-4/gpt-3.5-turbo) | No |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | No |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | No |
| `GITHUB_CALLBACK_URL` | OAuth callback URL | No |
| `FRONTEND_URL` | Frontend URL for CORS | No |
| `MAX_FILE_SIZE` | Max upload size in bytes | No |
| `RATE_LIMIT_WINDOW` | Rate limit window (minutes) | No |
| `RATE_LIMIT_MAX` | Max requests per window | No |

## 🧪 Testing

```bash
# Run tests
npm test

# Test specific file
npm test -- auth.test.js

# Coverage report
npm test -- --coverage
```

## 🐳 Docker Deployment

### Development
```bash
docker-compose up
```

### Production
```bash
# Build image
docker build -t ai-review-backend .

# Run container
docker run -d \
  -p 5000:5000 \
  -e MONGO_URI=your_mongo_uri \
  -e JWT_SECRET=your_secret \
  -e OPENAI_API_KEY=your_key \
  ai-review-backend
```

## 📊 Monitoring

Health check endpoint:
```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

## 🔧 Development

### Adding New Feature

1. Create model in `models/`
2. Create service in `services/`
3. Create controller in `controllers/`
4. Add routes in `routes/`
5. Update `app.js` to include routes

### Code Style

- Use ESLint for linting
- Follow Airbnb style guide
- Use async/await (no callbacks)
- Add JSDoc comments
- Handle errors properly

## 🚨 Error Handling

All errors are handled by the global error middleware and return:

```json
{
  "success": false,
  "error": "Error message",
  "stack": "..." // Only in development
}
```

## 📈 Performance

- MongoDB indexes on frequently queried fields
- Rate limiting on all endpoints
- Compression middleware
- Efficient logging with Winston
- Connection pooling

## 🔒 Security

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Helmet security headers
- CORS protection
- Input validation
- XSS protection
- MongoDB injection prevention

## 📄 License

MIT License - see LICENSE file

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Email: support@ai-code-review.com

---

Built with ❤️ using Node.js, Express, and MongoDB
