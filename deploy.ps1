Write-Host "🏗  Building Docker image..."

$BUILD_TIME = Get-Date -Format "yyyyMMddHHmmss"
$IMAGE = "us-central1-docker.pkg.dev/servoya-cloud-worker/cloud-run-source-deploy/servoya-cloud-worker-v2:$BUILD_TIME"

gcloud builds submit `
  --project=servoya-cloud-worker `
  --tag $IMAGE `
  --timeout=1200

Write-Host "🚀 Deploying to Cloud Run..."

gcloud run deploy servoya-cloud-worker-v2 `
  --image $IMAGE `
  --region=us-central1 `
  --platform=managed `
  --allow-unauthenticated `
  --project=servoya-cloud-worker

Write-Host "✅ Deployment complete."