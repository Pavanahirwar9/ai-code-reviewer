# POST /api/github/analyze - Repository Analysis Endpoint

## Overview
Streamlined endpoint for analyzing GitHub repositories with a clean 8-step flow.

## Endpoint
```
POST /api/github/analyze
```

## Authentication
Requires JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Request Body
```json
{
  "owner": "facebook",
  "repo": "react",
  "branch": "main",
  "options": {
    "maxFiles": 30,
    "maxFileSize": 100000,
    "batchSize": 3
  }
}
```

### Parameters
- **owner** (required): GitHub repository owner
- **repo** (required): Repository name
- **branch** (required): Branch to analyze
- **options** (optional):
  - `maxFiles`: Maximum number of files to analyze (default: 30)
  - `maxFileSize`: Maximum file size in bytes (default: 100000 = 100KB)
  - `batchSize`: Number of files to analyze concurrently (default: 3)

## Analysis Flow

### 1️⃣ Validate Repo & Branch
- Validates required parameters (owner, repo, branch)
- Checks GitHub OAuth connection
- Retrieves GitHub access token

### 2️⃣ Fetch Repo Tree
- Fetches complete repository file tree using GitHub Trees API
- Uses recursive mode to get all files in single request
- Logs total files found

### 3️⃣ Filter Source Files
- Filters to source code files only (20+ supported languages)
- Excludes binary files, config files, and non-code files
- Applies size and count limits from options
- Ignores folders: node_modules, dist, .git, vendor, etc.

### 4️⃣ Fetch File Contents
- Batch fetches file contents from GitHub
- Decodes Base64 content
- Handles large files (>1MB) with raw URL
- Continues on partial failures

### 5️⃣ Analyze Files (Lint + AI)
- **ESLint**: Static analysis for JavaScript/TypeScript
- **Security Patterns**: Regex-based security vulnerability detection
- **AI Analysis**: GPT-4o-mini code review with structured output
- Batched processing to prevent API overload
- Per-file scoring (0-100)

### 6️⃣ Aggregate Results
- Aggregates all bugs, security issues, performance warnings
- Tags each issue with fileName and fileLanguage
- Generates summary statistics:
  - Total counts by issue type
  - Severity breakdown (critical/warning/info)
  - File categorization by quality score
  - Language statistics
  - High-level summary text

### 7️⃣ Save Analysis History
- Creates Review document in MongoDB
- Updates Repo tracking with analysis count
- Stores comprehensive metadata
- Includes commit SHA for traceability

### 8️⃣ Return Analysis ID
- Returns analysis ID for later retrieval
- Includes summary statistics
- Provides high-level assessment

## Response

### Success (201)
```json
{
  "success": true,
  "message": "Repository analysis completed successfully",
  "data": {
    "analysisId": "679902a1f5e4a8b2c3d4e5f6",
    "summary": {
      "filesAnalyzed": 28,
      "totalIssues": 42,
      "overallScore": 75,
      "highLevelSummary": "⚠️ Overall code quality is good but has room for improvement (75/100). Analyzed 28 files with 8,432 lines of code. Found 42 total issues: 15 bugs, 8 security concerns, 19 performance warnings. 3 critical issues require immediate attention..."
    }
  }
}
```

### Error Responses

**400 Bad Request** - Missing or invalid parameters
```json
{
  "success": false,
  "message": "Owner, repo, and branch are required"
}
```

**401 Unauthorized** - GitHub not connected
```json
{
  "success": false,
  "message": "GitHub not connected. Please connect your GitHub account first."
}
```

**404 Not Found** - No files found
```json
{
  "success": false,
  "message": "No source files found after filtering"
}
```

**500 Internal Server Error** - Analysis failed
```json
{
  "success": false,
  "message": "Failed to analyze repository"
}
```

## Architecture

### Clean Architecture Principles
✅ **Separation of Concerns**: Controller → Service → Database
✅ **Async/Await**: No callback hell, clean promise handling
✅ **Error Handling**: Try-catch with proper error propagation
✅ **Logging**: Detailed logging at each step
✅ **Validation**: Input validation before processing
✅ **Modularity**: Reusable services (github, repoAnalysis)

### Services Used
- **githubService**: GitHub API interactions
- **repoAnalysisService**: File analysis and aggregation
- **Review Model**: MongoDB document storage
- **Repo Model**: Repository tracking

## Database Storage

### Review Document
```javascript
{
  _id: ObjectId("679902a1f5e4a8b2c3d4e5f6"),
  userId: ObjectId("..."),
  fileName: "facebook/react/main",
  language: "repository",
  fileSize: 8432,
  linesOfCode: 8432,
  overallScore: 75,
  bugs: [
    {
      type: "critical",
      message: "Potential null pointer dereference",
      line: 45,
      fileName: "src/index.js",
      fileLanguage: "javascript"
    }
  ],
  security: [...],
  performance: [...],
  suggestions: [...],
  status: "completed",
  metadata: {
    repository: {
      owner: "facebook",
      repo: "react",
      branch: "main",
      commit: "abc123..."
    },
    filesScanned: 150,
    filesAnalyzed: 28,
    filesFailed: 2,
    summary: {
      totalBugs: 15,
      totalSecurity: 8,
      totalPerformance: 19,
      totalIssues: 42,
      averageScore: 75,
      highLevelSummary: "...",
      byLanguage: {...},
      fileCategories: {...}
    },
    analyzedAt: ISODate("2026-01-28T18:31:00Z")
  },
  createdAt: ISODate("2026-01-28T18:31:00Z")
}
```

## Usage Example

### cURL
```bash
curl -X POST http://localhost:5000/api/github/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "facebook",
    "repo": "react",
    "branch": "main",
    "options": {
      "maxFiles": 20,
      "batchSize": 5
    }
  }'
```

### JavaScript (Fetch)
```javascript
const analyzeRepo = async () => {
  const response = await fetch('http://localhost:5000/api/github/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      owner: 'facebook',
      repo: 'react',
      branch: 'main',
      options: {
        maxFiles: 20
      }
    })
  });

  const data = await response.json();
  console.log('Analysis ID:', data.data.analysisId);
  console.log('Summary:', data.data.summary.highLevelSummary);
  
  return data.data.analysisId;
};
```

### Axios
```javascript
const axios = require('axios');

const result = await axios.post(
  'http://localhost:5000/api/github/analyze',
  {
    owner: 'facebook',
    repo: 'react',
    branch: 'main'
  },
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

console.log('Analysis ID:', result.data.data.analysisId);
```

## Performance

### Typical Analysis Times
- **10 files**: ~15-30 seconds
- **20 files**: ~30-60 seconds
- **30 files**: ~60-90 seconds

*Times vary based on file sizes, AI API response time, and batchSize setting*

### Optimization Tips
1. **Increase batchSize**: Analyze more files concurrently (3-5 recommended)
2. **Reduce maxFiles**: Focus on most important files
3. **Increase maxFileSize**: Skip large files that take longer to analyze
4. **Cache results**: Store analysis ID and reuse for same commit SHA

## Differences from /analyze-repo

| Feature | POST /analyze | POST /analyze-repo |
|---------|---------------|-------------------|
| **Focus** | Clean, streamlined flow | Comprehensive details |
| **Response** | Analysis ID + summary | Full results + details |
| **Default maxFiles** | 30 | 50 |
| **Use Case** | Quick analysis, history | Detailed review, debugging |
| **Response Size** | Small (KB) | Large (MB) |

## Best Practices

1. **Start Small**: Test with `maxFiles: 5` first
2. **Monitor Progress**: Check logs for step-by-step progress
3. **Handle Errors**: Implement retry logic for network failures
4. **Store Analysis ID**: Use for later retrieval of full results
5. **Rate Limiting**: Respect GitHub API rate limits (5000/hour)
6. **Token Expiry**: Refresh GitHub OAuth token when needed

## Status
✅ **Live and Running** on `http://localhost:5000/api/github/analyze`
