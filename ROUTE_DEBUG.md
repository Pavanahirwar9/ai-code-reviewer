# Route Debugging Guide - CodeLens AI

## Current Status ✅

**Both servers are running successfully:**
- ✅ Backend: http://localhost:5000/api
- ✅ Frontend: http://localhost:3000
- ✅ Login route tested: `/login` → 200 OK

## Configuration Verified ✅

### TypeScript Path Aliases
**File:** `frontend/tsconfig.json`
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
✅ Correctly configured to map `@/` to `./src/`

### Frontend Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── register/
│   │   ├── page.tsx (/)
│   │   └── layout.tsx
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   └── lib/
```
✅ All directories in correct location

## Available Routes

### Frontend Routes (Next.js)
- `/` - Landing page
- `/login` - Login page ✅ TESTED
- `/register` - Registration page
- `/dashboard` - Dashboard home
- `/dashboard/review` - Code review interface
- `/dashboard/github` - GitHub integration
- `/dashboard/history` - Review history
- `/dashboard/results` - Results pages
- `/dashboard/settings` - Settings

### Backend API Routes (Express)
- `GET /health` - Health check
- `GET /api` - API info
- **Auth:** `/api/auth/*`
- **Review:** `/api/review/*`
- **GitHub:** `/api/github/*`
- **User:** `/api/user/*`

## How to Test Routes

### Test Frontend Routes
1. Open browser to http://localhost:3000
2. Navigate to different pages
3. Check browser console for errors (F12)

### Test Backend API
```powershell
# Test health check
Invoke-WebRequest -Uri http://localhost:5000/health

# Test API info
Invoke-WebRequest -Uri http://localhost:5000/api
```

## Common Issues & Solutions

### Issue 1: 404 Not Found on Frontend Pages

**Possible Causes:**
- Page component missing
- Directory structure incorrect
- Build cache issue

**Solution:**
```powershell
cd frontend
Remove-Item -Recurse -Force .next
npm run dev
```

### Issue 2: Components Not Found (@/ imports)

**Symptoms:**
- Error: Cannot find module '@/components/...'
- TypeScript errors

**Solution:**
1. Verify `tsconfig.json` has correct paths
2. Restart TypeScript server in VS Code (Ctrl+Shift+P → "TypeScript: Restart TS Server")
3. Restart dev server

### Issue 3: API Calls Failing

**Symptoms:**
- Network errors in browser console
- CORS errors
- 404 on API routes

**Check:**
1. Backend server is running on port 5000
2. Frontend `.env.local` has correct API URL:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```
3. CORS is configured in backend

**Test API:**
```javascript
// In browser console at http://localhost:3000
fetch('http://localhost:5000/health')
  .then(r => r.json())
  .then(console.log)
```

### Issue 4: Blank Page or Hydration Errors

**Symptoms:**
- Page loads but shows nothing
- React hydration mismatch errors

**Solution:**
1. Check browser console for errors
2. Hard refresh: Ctrl+Shift+R
3. Clear browser cache

## Diagnostic Commands

### Check if servers are running:
```powershell
# Check ports
netstat -ano | findstr :3000
netstat -ano | findstr :5000
```

### View server logs:
- **Frontend**: Check terminal running `npm run dev` in frontend/
- **Backend**: Check terminal running `node src/server.js` in backend/

### Test specific route:
```powershell
# Frontend
Start-Process "http://localhost:3000/dashboard"

# Backend API
Invoke-RestMethod -Uri "http://localhost:5000/api" -Method GET
```

## What to Check

1. **Browser Console (F12)**
   - Any JavaScript errors?
   - Any network errors?
   - Any 404s or 500s?

2. **Frontend Terminal**
   - Any build errors?
   - Any component errors?

3. **Backend Terminal**
   - Any request logs?
   - Any error messages?

## Need More Help?

Please provide:
1. **Specific URL/route** that's not working
2. **Error message** you're seeing
3. **Where you see the error** (browser, terminal, etc.)
4. **Screenshot** if possible

## Quick Fixes

### Restart Everything:
```powershell
# Stop both servers (Ctrl+C in each terminal)

# Restart backend
cd backend
node src/server.js

# Restart frontend (new terminal)
cd frontend
npm run dev
```

### Clear All Caches:
```powershell
cd frontend
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache
npm run dev
```

### Rebuild:
```powershell
cd frontend
npm run build
npm run dev
```

## Current Server Status

Based on logs:
- ✅ Backend running successfully
- ✅ Frontend compiled successfully
- ✅ Login route working (200 response)
- ✅ No visible errors in logs

**Both applications appear to be working correctly!**

If you're experiencing a specific issue, please let me know:
- Which page/route?
- What error message?
- Where (browser/terminal)?
