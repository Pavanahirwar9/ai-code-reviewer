# ✅ Render Deployment Checklist

Follow this checklist to deploy your fixes to Render.

## 📋 Pre-Deployment Checklist

### 1. GitHub OAuth App Configuration
- [ ] Go to https://github.com/settings/developers
- [ ] Click on your OAuth App (or create new if needed)
- [ ] Update **Authorization callback URL** to:
  ```
  https://YOUR-BACKEND-URL.onrender.com/api/github/callback
  ```
  Example: `https://ai-code-reviewer-backend-wbf1.onrender.com/api/github/callback`
- [ ] Update **Homepage URL** to your frontend URL
- [ ] Copy your **Client ID** and **Client Secret**

### 2. Render Backend Environment Variables
Go to your backend service → Environment tab and set:

- [ ] `MONGODB_URI` - Your MongoDB connection string
- [ ] `OPENAI_API_KEY` - Your OpenAI API key
- [ ] `GITHUB_CLIENT_ID` - From GitHub OAuth App
- [ ] `GITHUB_CLIENT_SECRET` - From GitHub OAuth App
- [ ] **`GITHUB_CALLBACK_URL`** - `https://YOUR-BACKEND-URL.onrender.com/api/github/callback` ⭐ NEW!
- [ ] `FRONTEND_URL` - `https://YOUR-FRONTEND-URL.onrender.com`
- [ ] `JWT_SECRET` - (Auto-generated, leave as is)
- [ ] `SESSION_SECRET` - (Auto-generated, leave as is)

### 3. Render Frontend Environment Variables
Go to your frontend service → Environment tab and set:

- [ ] `NEXT_PUBLIC_API_URL` - `https://YOUR-BACKEND-URL.onrender.com/api`

### 4. Deploy Code Changes
- [ ] Commit all changes:
  ```bash
  git add .
  git commit -m "Fix: Render deployment issues - GitHub OAuth and download report"
  git push origin main
  ```
- [ ] Wait for Render to auto-deploy (check Render dashboard)

### 5. Verify Deployment

After deployment completes:

#### Test GitHub OAuth:
- [ ] Open your frontend URL
- [ ] Login/Register with email
- [ ] Go to Dashboard → GitHub
- [ ] Click "Connect GitHub" button
- [ ] Complete OAuth authorization
- [ ] ✅ Should redirect back with "GitHub connected successfully"

#### Test Download Report:
- [ ] Create a new code review
- [ ] Go to the results page
- [ ] Click "Download Report" button
- [ ] ✅ Should download a `.txt` file with review details

#### Test Avatar Upload:
- [ ] Go to Dashboard → Settings
- [ ] Upload a profile picture
- [ ] ✅ Avatar should display correctly

## 🔧 Troubleshooting

### GitHub OAuth redirects to localhost
**Problem:** `GITHUB_CALLBACK_URL` not set correctly

**Solution:**
1. Check Render backend environment has `GITHUB_CALLBACK_URL`
2. Verify it matches GitHub OAuth App callback URL exactly
3. Restart backend service in Render

### Download doesn't work
**Problem:** API URL not configured or CORS issue

**Solution:**
1. Check `NEXT_PUBLIC_API_URL` is set in frontend environment
2. Check browser console for errors
3. Verify you're logged in (token in localStorage)
4. Check backend logs in Render

### "Not allowed by CORS"
**Problem:** Frontend URL not in CORS allowed origins

**Solution:**
1. Check `FRONTEND_URL` is set in backend environment
2. Make sure it matches your actual frontend URL (no trailing slash)
3. Restart backend service

### Avatar not loading
**Problem:** Avatar URL not correct

**Solution:**
1. Check `NEXT_PUBLIC_API_URL` is set correctly
2. Verify backend `/uploads` directory is accessible
3. Re-upload avatar image

## 📝 Environment Variable Reference

### Backend (.env for local dev)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-code-review
JWT_SECRET=your-jwt-secret-here
SESSION_SECRET=your-session-secret-here
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/github/callback
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local for local dev)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=CodeLens AI
```

## 🚀 Quick Deploy Commands

```bash
# Commit and push changes
git add .
git commit -m "Fix: Render deployment issues"
git push origin main

# Check deployment status
# Go to: https://dashboard.render.com
# Select your services and monitor deployment logs
```

## ✨ Post-Deployment Success Indicators

You'll know everything is working when:
- ✅ GitHub OAuth completes and redirects to dashboard
- ✅ Reports download successfully as `.txt` files
- ✅ Avatars display correctly
- ✅ No CORS errors in browser console
- ✅ All API calls succeed (check Network tab)

## 📞 Need Help?

If you're still having issues:
1. Check Render logs for both services
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Make sure MongoDB is accessible
5. Ensure GitHub OAuth App URLs match exactly

---

**Files Modified:**
- `render.yaml` - Added GITHUB_CALLBACK_URL
- `backend/src/app.js` - Fixed CORS and cookies
- `backend/src/controllers/review.controller.js` - (no changes needed)
- `frontend/src/lib/api.ts` - Added downloadReport method
- `frontend/src/app/dashboard/results/[id]/page.tsx` - Fixed download function
- `frontend/src/app/dashboard/settings/page.tsx` - Fixed avatar and API URLs
- `frontend/src/app/dashboard/layout.tsx` - Fixed avatar URL
