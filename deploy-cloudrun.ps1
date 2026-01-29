# Quick Deploy Script for Cloud Run

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  CodeLens AI - Cloud Run Deploy" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: gcloud CLI is not installed" -ForegroundColor Red
    Write-Host "📥 Install from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Get project ID
$PROJECT_ID = Read-Host "Enter your GCP Project ID (or press Enter to create new)"

if ([string]::IsNullOrWhiteSpace($PROJECT_ID)) {
    $PROJECT_ID = "codelens-ai-" + (Get-Random -Minimum 1000 -Maximum 9999)
    Write-Host "📦 Creating new project: $PROJECT_ID" -ForegroundColor Green
    gcloud projects create $PROJECT_ID --name="CodeLens AI"
}

# Set project
Write-Host "🔧 Setting active project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Enable APIs
Write-Host "🔌 Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Deploy Backend
Write-Host ""
Write-Host "🚀 Deploying Backend..." -ForegroundColor Cyan
Set-Location backend

gcloud run deploy codelens-backend `
    --source . `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --set-env-vars="NODE_ENV=production,JWT_SECRET=change-this-in-production-$(Get-Random)" `
    --max-instances=10 `
    --memory=512Mi `
    --timeout=300

$BACKEND_URL = gcloud run services describe codelens-backend --region us-central1 --format="value(status.url)"
Write-Host "✅ Backend deployed: $BACKEND_URL" -ForegroundColor Green

# Deploy Frontend
Write-Host ""
Write-Host "🚀 Deploying Frontend..." -ForegroundColor Cyan
Set-Location ../frontend

gcloud run deploy codelens-frontend `
    --source . `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --set-env-vars="NODE_ENV=production,NEXT_PUBLIC_API_URL=$BACKEND_URL/api" `
    --max-instances=10 `
    --memory=1Gi `
    --timeout=300

$FRONTEND_URL = gcloud run services describe codelens-frontend --region us-central1 --format="value(status.url)"
Write-Host "✅ Frontend deployed: $FRONTEND_URL" -ForegroundColor Green

# Update backend with frontend URL
Write-Host ""
Write-Host "🔄 Updating CORS settings..." -ForegroundColor Yellow
Set-Location ../backend
gcloud run services update codelens-backend `
    --region us-central1 `
    --update-env-vars="FRONTEND_URL=$FRONTEND_URL"

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  ✅ Deployment Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Frontend URL: $FRONTEND_URL" -ForegroundColor Cyan
Write-Host "🔧 Backend URL:  $BACKEND_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Visit $FRONTEND_URL to access your app" -ForegroundColor White
Write-Host "  2. Update OPENAI_API_KEY in backend environment" -ForegroundColor White
Write-Host "  3. Configure custom domain (optional)" -ForegroundColor White
Write-Host ""
Write-Host "📚 For detailed instructions, see DEPLOYMENT.md" -ForegroundColor Yellow
