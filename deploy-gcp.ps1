# PowerShell Deployment Script for Google Cloud Run
$PROJECT_ID = (gcloud config get-value project)
$SERVICE_NAME = "sb-service"
$REGION = "asia-southeast1"

Write-Host "Starting deployment to Google Cloud Run..." -ForegroundColor Green
Write-Host "GCP Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Service Name: $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan

# Step 1: Deploy to Cloud Run using source code build
gcloud run deploy $SERVICE_NAME --source . --region $REGION --allow-unauthenticated --port 8080 --cpu 1 --memory 1Gi

Write-Host "Deployment completed successfully!" -ForegroundColor Green
