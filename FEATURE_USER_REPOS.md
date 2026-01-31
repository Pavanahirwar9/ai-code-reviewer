# Add User's Own GitHub Repository Feature

## Overview
This feature allows authenticated users to add their own GitHub repositories (both public and private) for code analysis using their GitHub OAuth connection.

## Implementation Details

### Backend Changes

#### 1. Controller (backend/src/controllers/github.controller.js)
- **New Method**: `addUserRepo`
- **Route**: POST `/api/github/add-user-repo`
- **Authentication**: Required (protect middleware)

**Features**:
- Validates GitHub OAuth token from session
- Fetches repository metadata from GitHub API
- Verifies user has access (owner/collaborator) for private repos
- Prevents duplicate entries (checks by userId + repoFullName)
- Saves repository to MongoDB with source: 'user-github'
- Returns repository details on success

**Request Body**:
```json
{
  "repoFullName": "owner/repository",
  "branch": "main" // optional, defaults to repo's default branch
}
```

**Response**:
```json
{
  "success": true,
  "message": "Repository added successfully",
  "data": {
    "id": "...",
    "repoFullName": "owner/repo",
    "defaultBranch": "main",
    "isPrivate": false,
    "source": "user-github"
  }
}
```

#### 2. Model Updates (backend/src/models/Repo.model.js)
Extended schema with new fields:
- `owner`: String - Repository owner
- `stars`: Number - Star count
- `source`: Enum ['github', 'user-github', 'public-url'] - Repository source

#### 3. Routes (backend/src/routes/github.routes.js)
Added protected route:
```javascript
router.post('/add-user-repo', addUserRepo);
```

### Frontend Changes

#### 1. API Client (frontend/src/lib/api.ts)
**New Method**: `addUserGitHubRepo`
```typescript
async addUserGitHubRepo(repoFullName: string, branch?: string)
```

#### 2. GitHub Integration Page (frontend/src/app/dashboard/github/page.tsx)

**New State**:
- `userRepoInput`: Repository name input (owner/repo format)
- `userRepoBranch`: Optional branch name
- `isAddingUserRepo`: Loading state for add operation

**New Handler**: `handleAddUserRepo`
- Validates input format (owner/repo)
- Calls API to add repository
- Refreshes repository list on success
- Displays appropriate success/error toasts

**New UI Card**: "Add Your Own Repository"
- Input field for repository name (owner/repo format)
- Optional branch input field
- Add button with loading state
- Info section explaining access requirements
- Validation for input format

## User Flow

1. User connects their GitHub account via OAuth
2. User navigates to GitHub Integration page
3. In "Add Your Own Repository" section:
   - Enters repository in `owner/repo` format (e.g., `facebook/react`)
   - Optionally specifies a branch (defaults to repo's default branch)
   - Clicks "Add Repository"
4. System validates:
   - OAuth token is valid
   - Repository exists on GitHub
   - User has access to the repository
   - Repository isn't already added
5. Repository is saved and appears in the repository dropdown
6. User can now select and analyze the repository

## Security Features

1. **OAuth Validation**: Verifies GitHub token before any operation
2. **Access Control**: Checks user has access to repository via GitHub API
3. **Duplicate Prevention**: Prevents same repo being added multiple times
4. **Private Repository Support**: Validates collaborator access for private repos
5. **Session-based**: Uses authenticated user's session for all operations

## Error Handling

### Backend Errors:
- Invalid/expired GitHub token
- Repository not found
- User doesn't have access to repository
- Duplicate repository
- GitHub API errors

### Frontend Errors:
- Invalid input format
- Network errors
- API errors with user-friendly messages

## Testing Checklist

- [ ] Connect GitHub account
- [ ] Add public repository (e.g., torvalds/linux)
- [ ] Add private repository you own
- [ ] Add private repository you collaborate on
- [ ] Try adding duplicate repository (should fail)
- [ ] Try adding repository without access (should fail)
- [ ] Verify repository appears in dropdown
- [ ] Analyze newly added repository
- [ ] Check results display correctly

## Future Enhancements

1. **Bulk Import**: Allow users to import multiple repositories at once
2. **Auto-sync**: Automatically fetch and add new repositories from user's GitHub
3. **Organization Support**: Allow adding all repositories from an organization
4. **Access Level Display**: Show user's access level (owner/admin/write/read)
5. **Repository Stats**: Display additional metadata (language, size, last update)
6. **Remove Repository**: Allow users to remove added repositories

## Related Files

### Backend:
- `backend/src/controllers/github.controller.js` (addUserRepo method)
- `backend/src/models/Repo.model.js` (schema updates)
- `backend/src/routes/github.routes.js` (route definition)

### Frontend:
- `frontend/src/lib/api.ts` (API client method)
- `frontend/src/app/dashboard/github/page.tsx` (UI implementation)

## API Endpoint Documentation

### POST /api/github/add-user-repo

**Authentication**: Required (JWT token)

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| repoFullName | string | Yes | Repository in owner/repo format |
| branch | string | No | Branch name (defaults to repo default) |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Repository added successfully",
  "data": {
    "id": "repo_id",
    "userId": "user_id",
    "repoFullName": "owner/repo",
    "defaultBranch": "main",
    "isPrivate": false,
    "description": "Repo description",
    "language": "JavaScript",
    "owner": "owner",
    "stars": 1234,
    "source": "user-github",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:

400 - Bad Request:
```json
{
  "success": false,
  "error": "Repository name is required"
}
```

401 - Unauthorized:
```json
{
  "success": false,
  "error": "GitHub not connected. Please connect your GitHub account first."
}
```

403 - Forbidden:
```json
{
  "success": false,
  "error": "You don't have access to this repository"
}
```

409 - Conflict:
```json
{
  "success": false,
  "error": "Repository already added"
}
```

## Deployment Notes

1. No environment variable changes required
2. MongoDB schema updates are handled automatically by Mongoose
3. Frontend and backend changes are backward compatible
4. No database migrations required
5. Feature works with existing OAuth implementation

## Maintenance

- Monitor GitHub API rate limits
- Log repository addition attempts for analytics
- Track most popular repositories being added
- Monitor error rates for access denied errors
