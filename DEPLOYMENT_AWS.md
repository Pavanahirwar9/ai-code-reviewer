# AWS Deployment Guide — CodeLens AI

This guide deploys the project as two AWS App Runner services (backend + frontend)
backed by **Amazon ECR** (container registry) and automated via **AWS CodeBuild**.

---

## Architecture

```
GitHub → AWS CodeBuild → Amazon ECR → AWS App Runner
                                       ├── ai-code-review-backend  (Node.js/Express)
                                       └── ai-code-review-frontend (Next.js)
```

---

## Prerequisites

| Tool | Install |
|------|---------|
| AWS CLI v2 | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html |
| Docker Desktop | https://www.docker.com/products/docker-desktop |
| An AWS account | https://aws.amazon.com/ |

---

## Step 1 — Configure AWS CLI

```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g. us-east-1), output format (json)
```

Verify it works:
```bash
aws sts get-caller-identity
```

---

## Step 2 — Create ECR Repositories

Run these commands (replace `us-east-1` with your preferred region):

```bash
# Set your variables
$REGION = "us-east-1"
$ACCOUNT_ID = $(aws sts get-caller-identity --query Account --output text)

# Create the two ECR repositories
aws ecr create-repository --repository-name ai-code-review-backend --region $REGION
aws ecr create-repository --repository-name ai-code-review-frontend --region $REGION

# Confirm they were created
aws ecr describe-repositories --region $REGION --query "repositories[].repositoryUri"
```

---

## Step 3 — Store Secrets in AWS Secrets Manager

All sensitive values are stored as JSON in a single secret:

```bash
aws secretsmanager create-secret `
  --name "ai-code-review/backend" `
  --region $REGION `
  --secret-string '{
    "MONGODB_URI":           "mongodb+srv://...",
    "JWT_SECRET":            "your-jwt-secret",
    "OPENAI_API_KEY":        "sk-...",
    "GITHUB_CLIENT_ID":      "...",
    "GITHUB_CLIENT_SECRET":  "...",
    "GOOGLE_CLIENT_ID":      "...",
    "GOOGLE_CLIENT_SECRET":  "...",
    "SESSION_SECRET":        "...",
    "EMAIL_HOST":            "smtp.gmail.com",
    "EMAIL_PORT":            "587",
    "EMAIL_USER":            "you@gmail.com",
    "EMAIL_PASS":            "your-app-password",
    "EMAIL_FROM":            "CodeLens AI <you@gmail.com>"
  }'
```

To **update** the secret later:
```bash
aws secretsmanager update-secret --secret-id ai-code-review/backend --region $REGION --secret-string '{...}'
```

---

## Step 4 — Create App Runner IAM Role

App Runner needs permission to pull images from ECR and read secrets.

```bash
# Create the trust policy file
@'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "tasks.apprunner.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
'@ | Out-File -Encoding ASCII trust-policy.json

# Create the role
aws iam create-role `
  --role-name AppRunnerECRAccessRole `
  --assume-role-policy-document file://trust-policy.json

# Attach the ECR access policy
aws iam attach-role-policy `
  --role-name AppRunnerECRAccessRole `
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess

# Attach Secrets Manager read policy
aws iam attach-role-policy `
  --role-name AppRunnerECRAccessRole `
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

# Get the ARN for use below
$ROLE_ARN = $(aws iam get-role --role-name AppRunnerECRAccessRole --query Role.Arn --output text)
```

---

## Step 5 — Build and Push Docker Images

### Authenticate Docker with ECR

```bash
aws ecr get-login-password --region $REGION | `
  docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
```

### Build & Push Backend

```bash
$BACKEND_URI = "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-code-review-backend"

docker build -t ai-code-review-backend ./backend
docker tag  ai-code-review-backend:latest "$BACKEND_URI:latest"
docker push "$BACKEND_URI:latest"
```

### Build & Push Frontend

Replace `https://BACKEND_URL` with your actual backend App Runner URL from Step 6.

```bash
$FRONTEND_URI = "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ai-code-review-frontend"

docker build `
  --build-arg NEXT_PUBLIC_API_URL="https://BACKEND_URL/api" `
  --build-arg NEXT_PUBLIC_APP_NAME="CodeLens AI" `
  -t ai-code-review-frontend ./frontend

docker tag  ai-code-review-frontend:latest "$FRONTEND_URI:latest"
docker push "$FRONTEND_URI:latest"
```

---

## Step 6 — Deploy Backend to App Runner

```bash
aws apprunner create-service `
  --region $REGION `
  --cli-input-json '{
    "ServiceName": "ai-code-review-backend",
    "SourceConfiguration": {
      "ImageRepository": {
        "ImageIdentifier": "'"$ACCOUNT_ID"'.dkr.ecr.'"$REGION"'.amazonaws.com/ai-code-review-backend:latest",
        "ImageConfiguration": {
          "Port": "8080",
          "RuntimeEnvironmentVariables": {
            "NODE_ENV":        "production",
            "PORT":            "8080",
            "OPENAI_MODEL":    "gpt-4o-mini",
            "RATE_LIMIT_WINDOW": "15",
            "RATE_LIMIT_MAX":    "100"
          },
          "RuntimeEnvironmentSecrets": {
            "MONGODB_URI":          "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:MONGODB_URI::",
            "JWT_SECRET":           "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:JWT_SECRET::",
            "OPENAI_API_KEY":       "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:OPENAI_API_KEY::",
            "GITHUB_CLIENT_ID":     "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:GITHUB_CLIENT_ID::",
            "GITHUB_CLIENT_SECRET": "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:GITHUB_CLIENT_SECRET::",
            "GOOGLE_CLIENT_ID":     "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:GOOGLE_CLIENT_ID::",
            "GOOGLE_CLIENT_SECRET": "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:GOOGLE_CLIENT_SECRET::",
            "SESSION_SECRET":       "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:SESSION_SECRET::",
            "EMAIL_HOST":           "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:EMAIL_HOST::",
            "EMAIL_PORT":           "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:EMAIL_PORT::",
            "EMAIL_USER":           "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:EMAIL_USER::",
            "EMAIL_PASS":           "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:EMAIL_PASS::",
            "EMAIL_FROM":           "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:ai-code-review/backend:EMAIL_FROM::"
          }
        },
        "ImageRepositoryType": "ECR"
      },
      "AuthenticationConfiguration": {
        "AccessRoleArn": "'"$ROLE_ARN"'"
      }
    },
    "InstanceConfiguration": {
      "Cpu": "1 vCPU",
      "Memory": "2 GB"
    },
    "HealthCheckConfiguration": {
      "Protocol": "HTTP",
      "Path": "/api/health",
      "Interval": 10,
      "Timeout": 5,
      "HealthyThreshold": 1,
      "UnhealthyThreshold": 5
    }
  }'
```

### Get the backend URL

```bash
$BACKEND_URL = $(aws apprunner describe-service `
  --service-arn $(aws apprunner list-services --region $REGION --query "ServiceSummaryList[?ServiceName=='ai-code-review-backend'].ServiceArn" --output text) `
  --region $REGION `
  --query "Service.ServiceUrl" --output text)

Write-Host "Backend URL: https://$BACKEND_URL"
```

---

## Step 7 — Update Backend CORS/OAuth env vars

Once the frontend is deployed (Step 8), set these two additional variables:

```bash
$BACKEND_ARN = $(aws apprunner list-services --region $REGION --query "ServiceSummaryList[?ServiceName=='ai-code-review-backend'].ServiceArn" --output text)

aws apprunner update-service `
  --region $REGION `
  --service-arn $BACKEND_ARN `
  --source-configuration '{
    "ImageRepository": {
      "ImageConfiguration": {
        "RuntimeEnvironmentVariables": {
          "FRONTEND_URL": "https://FRONTEND_URL",
          "BACKEND_URL":  "https://'"$BACKEND_URL"'"
        }
      }
    }
  }'
```

---

## Step 8 — Build & Deploy Frontend (with real backend URL)

Rebuild the frontend image injecting the real backend URL, push it, then create the frontend App Runner service:

```bash
# Rebuild with the real backend URL
docker build `
  --build-arg NEXT_PUBLIC_API_URL="https://$BACKEND_URL/api" `
  --build-arg NEXT_PUBLIC_APP_NAME="CodeLens AI" `
  -t ai-code-review-frontend ./frontend

docker tag  ai-code-review-frontend:latest "$FRONTEND_URI:latest"
docker push "$FRONTEND_URI:latest"

# Create the App Runner frontend service
aws apprunner create-service `
  --region $REGION `
  --cli-input-json '{
    "ServiceName": "ai-code-review-frontend",
    "SourceConfiguration": {
      "ImageRepository": {
        "ImageIdentifier": "'"$ACCOUNT_ID"'.dkr.ecr.'"$REGION"'.amazonaws.com/ai-code-review-frontend:latest",
        "ImageConfiguration": {
          "Port": "8080",
          "RuntimeEnvironmentVariables": {
            "NODE_ENV":               "production",
            "NEXT_PUBLIC_API_URL":    "https://'"$BACKEND_URL"'/api",
            "NEXT_PUBLIC_APP_NAME":   "CodeLens AI"
          }
        },
        "ImageRepositoryType": "ECR"
      },
      "AuthenticationConfiguration": {
        "AccessRoleArn": "'"$ROLE_ARN"'"
      }
    },
    "InstanceConfiguration": {
      "Cpu": "1 vCPU",
      "Memory": "2 GB"
    }
  }'
```

---

## Step 9 — Verify Deployment

```bash
# List all App Runner services and their URLs
aws apprunner list-services --region $REGION `
  --query "ServiceSummaryList[].{Name:ServiceName,Status:Status,URL:ServiceUrl}" `
  --output table

# Check backend health
curl "https://$BACKEND_URL/api/health"
```

---

## Step 10 — Automated CI/CD with CodeBuild (optional)

The included `buildspec.yml` at the root of the repo automates Steps 5-8 on every `git push`.

### Create the CodeBuild project

```bash
aws codebuild create-project `
  --name ai-code-review-pipeline `
  --region $REGION `
  --source '{
    "type": "GITHUB",
    "location": "https://github.com/Pavanahirwar9/ai-code-reviewer",
    "buildspec": "buildspec.yml"
  }' `
  --artifacts '{"type": "NO_ARTIFACTS"}' `
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/standard:7.0",
    "computeType": "BUILD_GENERAL1_SMALL",
    "privilegedMode": true,
    "environmentVariables": [
      {"name": "AWS_REGION",           "value": "'"$REGION"'"},
      {"name": "AWS_ACCOUNT_ID",       "value": "'"$ACCOUNT_ID"'"},
      {"name": "BACKEND_SERVICE_NAME", "value": "ai-code-review-backend"},
      {"name": "FRONTEND_SERVICE_NAME","value": "ai-code-review-frontend"}
    ]
  }' `
  --service-role "arn:aws:iam::$ACCOUNT_ID:role/CodeBuildServiceRole"
```

### Enable GitHub webhook trigger

```bash
aws codebuild create-webhook `
  --project-name ai-code-review-pipeline `
  --filter-groups '[[{"type":"EVENT","pattern":"PUSH"},{"type":"HEAD_REF","pattern":"^refs/heads/main$"}]]' `
  --region $REGION
```

---

## OAuth Callback URLs to Update

After deployment, update these in your GitHub/Google OAuth app settings:

| Provider | Callback URL |
|----------|-------------|
| GitHub OAuth App | `https://<BACKEND_URL>/api/auth/github/callback` |
| Google Cloud Console | `https://<BACKEND_URL>/api/auth/google/callback` |

---

## Cost Estimate (App Runner)

| Resource | Cost |
|----------|------|
| App Runner (paused) | $0.005/vCPU-hr, $0.0005/GB-hr |
| ECR storage | $0.10/GB/month |
| Secrets Manager | $0.40/secret/month |
| Data transfer | ~$0.09/GB outbound |

For low-traffic projects the total is typically **$5–20/month**.

---

## Quick Reference

| Task | Command |
|------|---------|
| Re-deploy backend | Push new image to ECR, then `aws apprunner start-deployment` |
| View logs | AWS Console → App Runner → your service → Logs |
| Delete services | `aws apprunner delete-service --service-arn <ARN>` |
| Update secrets | `aws secretsmanager update-secret --secret-id ai-code-review/backend` |
