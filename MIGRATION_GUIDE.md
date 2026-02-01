# Database Migration Guide

## Repository Field Migration

After deploying the updated code, you need to run a one-time migration to update existing repository records with the new field structure.

### Method 1: Using API Endpoint (Recommended)

1. **Wait for Render deployment to complete** (~2-3 minutes after pushing)

2. **Open your browser's Developer Console** (F12)

3. **Navigate to your deployed app** and login

4. **Run this code in the browser console**:

```javascript
fetch('https://ai-code-reviewer-backend.onrender.com/api/migrate/repos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(res => res.json())
.then(data => console.log('Migration result:', data))
.catch(err => console.error('Migration error:', err));
```

5. **Check the console output** - You should see:
```json
{
  "success": true,
  "data": {
    "totalRepos": X,
    "updatedRepos": Y,
    "skippedRepos": Z,
    "updates": [...]
  },
  "message": "Migration complete! Updated Y repositories"
}
```

6. **Refresh the Repositories page** - Your repos should now appear!

### Method 2: Using Command Line (Alternative)

If you have direct access to the backend server:

```bash
cd backend
node migrate-repos.js
```

### What the Migration Does

The migration script:
- Syncs old field names (`repoName`, `repoFullName`, `repoUrl`) to new field names (`name`, `full_name`, `html_url`)
- Adds the `source` field to existing repos (defaults to 'github')
- Ensures backward compatibility with existing database records
- Does NOT delete any data - only adds missing fields

### Troubleshooting

**If repos still don't appear after migration:**

1. Check browser console for errors
2. Verify the migration ran successfully (check the response)
3. Try logging out and logging back in
4. Clear browser cache and reload

**If you see an authentication error:**

The migration endpoint requires authentication. Make sure:
- You're logged in to the application
- The token in localStorage is valid
- You're using the correct backend URL

### After Migration

Once the migration is complete:
- All existing OAuth-connected repositories will appear
- All URL-added repositories will appear
- The Repositories page will show accurate counts
- Both sources will work correctly

---

**Note:** This is a ONE-TIME migration. After running it once successfully, you don't need to run it again.
