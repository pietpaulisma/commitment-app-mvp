#!/bin/bash

# Quick Deploy to Dev and Open with Playwright
# Usage: ./deploy-dev.sh

echo "🚀 Deploying to dev and opening with Playwright..."

# Push to dev
git push origin dev

# Wait for deployment
echo "⏳ Waiting for deployment..."
sleep 20

# Get latest URL  
LATEST_URL=$(VERCEL_TOKEN="FrMWJpIinCZ85Jeinfqoiq8t" vercel --token "FrMWJpIinCZ85Jeinfqoiq8t" ls commitment-app-dev --next 0 | head -1 | grep -o 'https://[^[:space:]]*')

echo "🌐 Latest URL: $LATEST_URL"
echo "🔄 Waiting for site to be ready..."
sleep 30

# Save URL for Claude to use
echo "$LATEST_URL" > /tmp/dev_url.txt
echo "✅ Deployment ready! URL saved to /tmp/dev_url.txt"
echo "🎯 You can now ask Claude to open this URL with Playwright"
echo ""
echo "Just say: 'Open the dev URL with Playwright'"