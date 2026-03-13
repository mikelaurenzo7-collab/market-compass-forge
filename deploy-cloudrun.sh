#!/bin/bash
# Deploy script for Google Cloud Run
# Usage: ./deploy-cloudrun.sh

set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-your-gcp-project-id}"
SERVICE_NAME="market-compass-api"
REGION="us-central1"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

# Build Docker image
gcloud builds submit --tag "$IMAGE" .

# Deploy to Cloud Run
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "$(cat .env | grep -v '^#' | xargs | sed 's/ /,/g')"

# Show service URL
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)'
