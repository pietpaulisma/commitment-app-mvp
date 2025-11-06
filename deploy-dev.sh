#!/bin/bash
# Deploy to DEV environment ONLY
# This is the ONLY script that should be used for regular deployments

set -e  # Exit on error

echo "============================================"
echo "  DEPLOYING TO DEV ENVIRONMENT"
echo "  Target: commitment-app-dev.vercel.app"
echo "============================================"
echo ""

# Step 1: Link to dev project
echo "📦 Linking to dev project..."
vercel link --project=commitment-app-dev --scope=pietpaulismas-projects --yes

# Step 2: Build
echo ""
echo "🔨 Building project..."
npm run build

# Step 3: Deploy to dev (production mode of dev project)
echo ""
echo "🚀 Deploying to dev..."
vercel --prod --yes

echo ""
echo "============================================"
echo "✅ DEPLOYED TO DEV SUCCESSFULLY"
echo "   URL: https://commitment-app-dev.vercel.app"
echo "============================================"
