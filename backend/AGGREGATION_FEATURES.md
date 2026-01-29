# Repository Analysis Aggregation Features

## Overview
Enhanced file-by-file repository analysis with comprehensive aggregation and structured responses.

## Features Implemented

### 1. **Total Counts**
- ✅ Total bugs across all files
- ✅ Total security issues
- ✅ Total performance warnings
- ✅ Total suggestions
- ✅ Total issues (bugs + security + performance)
- ✅ Total lines of code analyzed

### 2. **Severity Breakdown**
- ✅ Critical issues count
- ✅ Warning issues count
- ✅ Info issues count
- ✅ Severity distribution object: `{ critical, warning, info }`

### 3. **File Categorization**
Files are categorized by their quality score:
- **Clean** (score >= 80): Well-written, minimal issues
- **Needs Attention** (score 50-79): Room for improvement
- **Critical** (score < 50): Requires urgent refactoring

### 4. **Language Statistics**
Per-language breakdown including:
- Number of files
- Bugs count
- Security issues count
- Performance warnings count
- Lines of code

### 5. **High-Level Summary**
Auto-generated human-readable summary including:
- Overall code quality assessment (Excellent/Good/Needs Improvement)
- File and LOC statistics
- Issues breakdown by type
- Critical issues highlighting
- File categories distribution
- Primary programming language

### 6. **MongoDB Storage**
Complete analysis saved to MongoDB with:
- Aggregated bugs, security, performance issues
- Each issue tagged with fileName and fileLanguage
- Comprehensive metadata (repository info, stats, summary)
- Repository tracking with analysis history

### 7. **Structured Response**
Final API response includes:
```json
{
  "success": true,
  "reviewId": "MongoDB document ID",
  "repository": {
    "owner": "...",
    "repo": "...",
    "branch": "...",
    "commit": "..."
  },
  "analysis": {
    "filesScanned": 50,
    "filesAnalyzed": 48,
    "filesFailed": 2,
    "totalTime": "45.2s",
    "analyzedAt": "2026-01-28T..."
  },
  "aggregatedResults": {
    "totalBugs": 15,
    "totalSecurity": 3,
    "totalPerformance": 8,
    "totalIssues": 26,
    "totalSuggestions": 42,
    "criticalIssues": 2,
    "warningIssues": 13,
    "infoIssues": 0
  },
  "summary": {
    "overallScore": 72,
    "totalLinesOfCode": 15432,
    "highLevelSummary": "⚠️ Overall code quality is good but has room for improvement (72/100). Analyzed 48 files...",
    "fileCategories": {
      "clean": 25,
      "needsAttention": 18,
      "critical": 5
    },
    "bySeverity": {
      "critical": 2,
      "warning": 13,
      "info": 0
    },
    "byLanguage": {
      "javascript": {
        "files": 30,
        "bugs": 10,
        "security": 2,
        "performance": 5,
        "linesOfCode": 8500
      },
      "typescript": { ... }
    }
  },
  "detailedResults": [
    {
      "fileName": "src/app.js",
      "language": "javascript",
      "linesOfCode": 245,
      "overallScore": 85,
      "issueCount": {
        "bugs": 2,
        "security": 0,
        "performance": 1
      }
    },
    ...
  ]
}
```

## API Endpoint

**POST** `/api/github/analyze-repo`

### Request Body
```json
{
  "repo": "owner/repo-name",
  "branch": "main",
  "options": {
    "maxFiles": 50,
    "maxFileSize": 100000,
    "batchSize": 3
  }
}
```

### Response Structure
- **success**: Boolean indicating operation success
- **reviewId**: MongoDB document ID for this analysis
- **repository**: Repository metadata (owner, repo, branch, commit)
- **analysis**: Analysis metadata (files scanned/analyzed/failed, time)
- **aggregatedResults**: Total counts of all issue types
- **summary**: High-level statistics and quality assessment
- **detailedResults**: Per-file summary with scores and issue counts

## Database Schema

### Review Document
```javascript
{
  userId: ObjectId,
  fileName: "owner/repo/branch",
  language: "repository",
  fileSize: totalLinesOfCode,
  linesOfCode: totalLinesOfCode,
  overallScore: averageScore,
  bugs: [
    {
      ...bugDetails,
      fileName: "src/app.js",
      fileLanguage: "javascript"
    }
  ],
  security: [...],
  performance: [...],
  suggestions: [...],
  status: "completed",
  analysisTime: "45.2s",
  metadata: {
    repository: {...},
    filesScanned: 50,
    filesAnalyzed: 48,
    filesFailed: 2,
    summary: {...},
    totalTime: "45.2s",
    analyzedAt: Date
  }
}
```

## Benefits

1. **Comprehensive Insights**: Get complete picture of repository health
2. **Actionable Data**: Prioritize files needing attention via categorization
3. **Language-Specific**: Identify which languages need most work
4. **Historical Tracking**: All results saved to MongoDB for trend analysis
5. **Easy Interpretation**: High-level summary provides quick understanding
6. **Detailed Drill-Down**: Access per-file details when needed
7. **Scalable**: Batch processing prevents API overload
8. **Resilient**: Failed files don't block entire analysis

## Usage Example

```javascript
// POST /api/github/analyze-repo
const response = await fetch('/api/github/analyze-repo', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    repo: 'facebook/react',
    branch: 'main',
    options: {
      maxFiles: 100,
      maxFileSize: 150000,
      batchSize: 5
    }
  })
});

const data = await response.json();
console.log(data.summary.highLevelSummary);
// "✅ Overall code quality is excellent (92/100). Analyzed 100 files with 45,678 lines of code..."
```

## Files Modified

1. **backend/src/services/repoAnalysis.service.js**
   - Enhanced `generateSummary()` with comprehensive aggregation
   - Added `generateHighLevelSummary()` for human-readable text
   - Exported `generateSummary` for external use

2. **backend/src/controllers/github.controller.js**
   - Enhanced `analyzeRepoFileByFile()` controller
   - Added issue aggregation with file tagging
   - Improved MongoDB storage with complete metadata
   - Structured final response with all aggregation data

## Testing

```bash
# Example request
curl -X POST http://localhost:5000/api/github/analyze-repo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "owner/repo",
    "branch": "main",
    "options": {
      "maxFiles": 20
    }
  }'
```

## Status
✅ **Implemented and Running** on `http://localhost:5000`
