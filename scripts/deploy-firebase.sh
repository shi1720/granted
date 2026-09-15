#!/usr/bin/env bash
set -euo pipefail
# Prerequisites: gcloud and Firebase CLI already authenticated; billing enabled.
PROJECT_ID="${PROJECT_ID:-granted-ai-2026}"
REGION="${REGION:-us-central1}"
SITE_ID="${SITE_ID:-grantedai}"
SERVICE="${SERVICE:-granted}"
npm ci
npm run lint
npm test
npm run build
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com --project="$PROJECT_ID"
# Create the secret once, outside this script. Never pass its value on the command line.
gcloud run deploy "$SERVICE" --source=. --project="$PROJECT_ID" --region="$REGION" \
  --service-account="granted-runtime@$PROJECT_ID.iam.gserviceaccount.com" \
  --set-secrets=OPENAI_API_KEY=granted-openai:latest \
  --set-env-vars="^|^OPENAI_MODEL=gpt-4.1-mini|ALLOWED_ORIGINS=https://$SITE_ID.web.app,https://$SITE_ID.firebaseapp.com" \
  --max-instances=1 --concurrency=10 --memory=512Mi --cpu=1 --timeout=600 --allow-unauthenticated --quiet
API_URL="$(gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
gcloud run services update "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --update-env-vars="PUBLIC_API_BASE=$API_URL" --quiet
firebase deploy --only hosting --project="$PROJECT_ID" --non-interactive
BASE_URL="https://$SITE_ID.web.app" node scripts/api-smoke.mjs
