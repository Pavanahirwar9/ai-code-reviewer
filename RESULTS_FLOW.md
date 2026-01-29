# Code Review Results Flow

## Overview
After submitting code for review, you will be automatically redirected to the analysis results page.

## How It Works

### 1. **Submit Code for Review**
You can submit code in two ways:

#### A. Direct Code Upload (New Review Page)
- Navigate to **Dashboard → New Review** (`/dashboard/review`)
- Upload a file or paste code directly
- Select programming language
- Click "Analyze Code"
- ✅ **Automatically redirected to results page after analysis**

#### B. GitHub Repository Analysis
- Navigate to **Dashboard → GitHub** (`/dashboard/github`)
- Connect your GitHub account
- Select a repository and branch
- Click "Analyze Repository"
- ✅ **Automatically redirected to results page after analysis**

### 2. **View Results**

After analysis completes, you'll see:
- **Summary Section**: Overall code quality score and analysis
- **Bugs Detected**: List of potential bugs with severity levels
- **Security Issues**: Security vulnerabilities found
- **Performance Issues**: Performance optimization suggestions
- **General Suggestions**: Code improvement recommendations

### 3. **Access Results Later**

You can always access your analysis results from:

#### Dashboard Table
- Go to **Dashboard** (`/dashboard`)
- See "Recent Reviews" table with all your analyses
- Click **"View"** button next to any completed review
- This takes you to `/dashboard/results/[reviewId]`

#### Direct URL
- Use the review ID: `/dashboard/results/[reviewId]`
- Example: `http://localhost:3000/dashboard/results/679895a4b2c3d4e5f6789abc`

### 4. **Download Report**

On the results page:
- Click **"Download Report"** button at the top
- Downloads a text file with complete analysis
- File name format: `code-review-report-[reviewId].txt`

## Features

### Real-Time Updates
- Dashboard auto-refreshes every 5-30 seconds
- Processing status updates automatically
- New reviews highlighted with "New" badge

### Status Indicators
- **🟢 Completed**: Analysis finished, view results
- **🟡 Processing**: Analysis in progress (with spinner)
- **🔴 Failed**: Analysis encountered an error

### Visual Feedback
- Success toast: "Analysis complete! Redirecting to results..."
- Loading spinners during processing
- Animated progress bars
- Color-coded issue counts (bugs, security, performance)

## Technical Details

### Data Storage
- Reviews saved to MongoDB database
- Accessible via review ID
- SessionStorage used for immediate access after analysis
- API fallback if sessionStorage is empty

### API Endpoints Used
- `POST /api/review/analyze` - Submit code for analysis
- `POST /api/github/analyze` - Analyze GitHub repository
- `GET /api/review/:id` - Fetch specific review results
- `GET /api/review/history` - List all user reviews
- `GET /api/review/stats` - Dashboard statistics

## Example Flow

```
User submits code
      ↓
Backend analyzes code with AI
      ↓
Review saved to MongoDB with unique ID
      ↓
Frontend receives response with review ID
      ↓
Review data stored in sessionStorage
      ↓
Auto-redirect to /dashboard/results/[reviewId]
      ↓
Results page loads data (sessionStorage or API)
      ↓
User sees complete analysis with download option
```

## Troubleshooting

### "No Results Found"
- Check if review ID is correct
- Verify you're logged in
- Check dashboard for review status
- Processing may still be in progress

### Results Not Loading
1. Check browser console for errors
2. Verify backend is running (port 5000)
3. Check MongoDB connection
4. Try refreshing the page

### Can't Find Review
1. Go to Dashboard
2. Check "Recent Reviews" table
3. Look for your file name
4. Click "View" button when status is "Completed"

## URLs Reference

- **Dashboard**: `http://localhost:3000/dashboard`
- **New Review**: `http://localhost:3000/dashboard/review`
- **GitHub Integration**: `http://localhost:3000/dashboard/github`
- **Results Page**: `http://localhost:3000/dashboard/results/[reviewId]`
- **Backend API**: `http://localhost:5000/api`

---

**Note**: Results are automatically displayed after analysis. You never need to search for them manually!
