# Cloud Run Deployment Guide

## Prerequisites

1. **Google Cloud Account** - Create one at https://console.cloud.google.com
2. **gcloud CLI** - Install from https://cloud.google.com/sdk/docs/install
3. **Docker** - Install from https://docs.docker.com/get-docker/

## Step 1: Set Up Google Cloud

### 1.1 Install and Initialize gcloud CLI

```bash
# Install gcloud CLI (if not installed)
# Visit: https://cloud.google.com/sdk/docs/install

# Initialize gcloud
gcloud init

# Login to your Google account
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

### 1.2 Create a New GCP Project (Optional)

```bash
# Create new project
gcloud projects create codelens-ai --name="CodeLens AI"

# Set as active project
gcloud config set project codelens-ai

# Enable billing (required for Cloud Run)
# Visit: https://console.cloud.google.com/billing
```

### 1.3 Enable Required APIs

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Enable Artifact Registry API
gcloud services enable artifactregistry.googleapis.com
```

## Step 2: Configure Docker Authentication

```bash
# Configure Docker to use gcloud as a credential helper
gcloud auth configure-docker
```

## Step 3: Deploy Backend to Cloud Run

### 3.1 Build and Deploy Backend

```bash
# Navigate to backend directory
cd backend

# Deploy to Cloud Run (builds and deploys in one command)
gcloud run deploy codelens-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,JWT_SECRET=your-super-secret-key" \
  --max-instances=10 \
  --memory=512Mi \
  --timeout=300

# Note the service URL that's displayed (e.g., https://codelens-backend-xxx-uc.a.run.app)
```

### 3.2 Set Environment Variables for Backend

```bash
# Update with your environment variables
gcloud run services update codelens-backend \
  --region=us-central1 \
  --set-env-vars="
    NODE_ENV=production,
    JWT_SECRET=your-super-secret-jwt-key-change-this,
    JWT_EXPIRE=7d,
    OPENAI_API_KEY=your-openai-api-key,
    FRONTEND_URL=https://codelens-frontend-xxx-uc.a.run.app,
    RATE_LIMIT_WINDOW_MS=900000,
    RATE_LIMIT_MAX_REQUESTS=100
  "

# Optional: Add MongoDB if you want database
# MONGODB_URI=your-mongodb-connection-string
```

## Step 4: Deploy Frontend to Cloud Run

### 4.1 Update Frontend Environment Variables

Before deploying, update `frontend/.env.local` with your backend URL:

```env
NEXT_PUBLIC_API_URL=https://codelens-backend-YOUR-URL.run.app/api
NEXT_PUBLIC_APP_NAME=CodeLens AI
```

### 4.2 Build and Deploy Frontend

```bash
# Navigate to frontend directory
cd ../frontend

# Deploy to Cloud Run
gcloud run deploy codelens-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,NEXT_PUBLIC_API_URL=https://codelens-backend-xxx-uc.a.run.app/api" \
  --max-instances=10 \
  --memory=1Gi \
  --timeout=300

# Note the frontend service URL (this is your live app!)
```

## Step 5: Update CORS in Backend

After getting the frontend URL, update backend CORS:

```bash
gcloud run services update codelens-backend \
  --region=us-central1 \
  --update-env-vars="FRONTEND_URL=https://codelens-frontend-xxx-uc.a.run.app"
```

## Step 6: Test Your Deployment

1. **Access Frontend**: Visit the frontend URL from Step 4.2
2. **Test Backend**: Visit `https://your-backend-url/health`
3. **Test API**: Visit `https://your-backend-url/api`

## Alternative: Using Docker Build Locally

### Build Backend Docker Image

```bash
cd backend

# Build the image
docker build -t gcr.io/YOUR_PROJECT_ID/codelens-backend .

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/codelens-backend

# Deploy the image
gcloud run deploy codelens-backend \
  --image gcr.io/YOUR_PROJECT_ID/codelens-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Build Frontend Docker Image

```bash
cd frontend

# Build the image
docker build -t gcr.io/YOUR_PROJECT_ID/codelens-frontend .

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/codelens-frontend

# Deploy the image
gcloud run deploy codelens-frontend \
  --image gcr.io/YOUR_PROJECT_ID/codelens-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Managing Your Deployment

### View Services

```bash
# List all Cloud Run services
gcloud run services list

# Get service details
gcloud run services describe codelens-backend --region=us-central1
```

### View Logs

```bash
# View backend logs
gcloud run services logs read codelens-backend --region=us-central1

# View frontend logs
gcloud run services logs read codelens-frontend --region=us-central1

# Follow logs in real-time
gcloud run services logs tail codelens-backend --region=us-central1
```

### Update Service

```bash
# Update environment variables
gcloud run services update codelens-backend \
  --region=us-central1 \
  --update-env-vars="NEW_VAR=value"

# Update memory/CPU
gcloud run services update codelens-backend \
  --region=us-central1 \
  --memory=1Gi \
  --cpu=2
```

### Delete Services

```bash
# Delete backend
gcloud run services delete codelens-backend --region=us-central1

# Delete frontend
gcloud run services delete codelens-frontend --region=us-central1
```

## Cost Optimization

Cloud Run pricing is based on:
- Request time (billed per 100ms)
- Memory allocation
- CPU allocation
- Requests count

### Free Tier (as of 2024)
- 2 million requests/month
- 360,000 GB-seconds of memory/month
- 180,000 vCPU-seconds/month

### Optimize Costs:
```bash
# Set minimum instances to 0 (scale to zero when no traffic)
gcloud run services update codelens-backend \
  --region=us-central1 \
  --min-instances=0

# Set maximum instances to limit costs
gcloud run services update codelens-backend \
  --region=us-central1 \
  --max-instances=5

# Reduce memory if not needed
gcloud run services update codelens-backend \
  --region=us-central1 \
  --memory=256Mi
```

## Custom Domain (Optional)

### Add Custom Domain

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=codelens-frontend \
  --domain=www.yourdomain.com \
  --region=us-central1
```

Follow the instructions to add DNS records to your domain.

## Security Best Practices

### 1. Use Secrets Manager

```bash
# Create secret
echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding jwt-secret \
  --member=serviceAccount:YOUR-PROJECT-NUMBER-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

# Use secret in Cloud Run
gcloud run services update codelens-backend \
  --region=us-central1 \
  --update-secrets=JWT_SECRET=jwt-secret:latest
```

### 2. Enable HTTPS Only

```bash
# Ensure HTTPS
gcloud run services update codelens-backend \
  --region=us-central1 \
  --ingress=all \
  --platform=managed
```

### 3. Set Up Authentication (Optional)

```bash
# Require authentication
gcloud run services update codelens-backend \
  --region=us-central1 \
  --no-allow-unauthenticated
```

## Continuous Deployment with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - uses: google-github-actions/setup-gcloud@v0
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - run: |
          cd backend
          gcloud run deploy codelens-backend \
            --source . \
            --region us-central1 \
            --platform managed

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v2
      
      - uses: google-github-actions/setup-gcloud@v0
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - run: |
          cd frontend
          gcloud run deploy codelens-frontend \
            --source . \
            --region us-central1 \
            --platform managed
```

## Monitoring

### Set Up Cloud Monitoring

```bash
# Enable Cloud Monitoring API
gcloud services enable monitoring.googleapis.com

# View metrics in console
# Visit: https://console.cloud.google.com/monitoring
```

### Set Up Alerts

1. Go to Cloud Console → Monitoring → Alerting
2. Create alert for:
   - High error rate
   - High latency
   - High memory usage

## Troubleshooting

### Service Won't Deploy

```bash
# Check build logs
gcloud builds list --limit=5

# View specific build
gcloud builds describe BUILD_ID

# Check service status
gcloud run services describe codelens-backend --region=us-central1
```

### Service Crashes

```bash
# View logs
gcloud run services logs read codelens-backend --region=us-central1 --limit=100

# Check environment variables
gcloud run services describe codelens-backend --region=us-central1 --format=yaml
```

### Connection Issues

1. Check CORS settings in backend
2. Verify frontend has correct backend URL
3. Check firewall rules
4. Ensure services are public (--allow-unauthenticated)

## Quick Reference

### Essential Commands

```bash
# Deploy backend
cd backend && gcloud run deploy codelens-backend --source . --region us-central1 --allow-unauthenticated

# Deploy frontend
cd frontend && gcloud run deploy codelens-frontend --source . --region us-central1 --allow-unauthenticated

# View logs
gcloud run services logs tail codelens-backend --region us-central1

# Update env vars
gcloud run services update codelens-backend --region us-central1 --set-env-vars="KEY=value"

# Delete service
gcloud run services delete codelens-backend --region us-central1
```

## Estimated Costs

For a small app with moderate traffic:
- **Free tier**: Easily covers MVP/personal projects
- **Low traffic** (1000 requests/day): ~$1-5/month
- **Medium traffic** (10000 requests/day): ~$10-30/month
- **High traffic** (100000 requests/day): ~$50-150/month

## Next Steps

1. ✅ Deploy backend
2. ✅ Deploy frontend
3. ✅ Test the application
4. ⚙️ Set up custom domain (optional)
5. ⚙️ Configure monitoring
6. ⚙️ Set up CI/CD (optional)
7. ⚙️ Add MongoDB for persistence (optional)

---

**Your CodeLens AI platform is now live on Google Cloud Run! 🚀**
