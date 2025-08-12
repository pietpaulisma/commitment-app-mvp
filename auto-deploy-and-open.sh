#!/bin/bash

# Automated Deploy and Open with Playwright
# This script deploys to dev and automatically opens the URL with Playwright via Claude Code

set -e

echo "🚀 Auto-deploying to dev and opening with Playwright..."

# Function to get latest dev URL
get_latest_dev_url() {
    VERCEL_TOKEN="FrMWJpIinCZ85Jeinfqoiq8t" vercel --token "FrMWJpIinCZ85Jeinfqoiq8t" ls commitment-app-dev --next 0 | head -1 | grep -o 'https://[^[:space:]]*'
}

# Push to dev
echo "📤 Pushing changes to dev branch..."
git push origin dev

# Wait for deployment to start
echo "⏳ Waiting for Vercel to start deployment..."
sleep 20

# Get URL
echo "🔍 Fetching latest deployment URL..."
LATEST_URL=$(get_latest_dev_url)
echo "🌐 Found: $LATEST_URL"

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
sleep 40

# Save URL and trigger Playwright
echo "$LATEST_URL" > /tmp/claude_dev_url.txt
echo "✅ Deployment complete!"
echo "🎯 URL: $LATEST_URL"
echo ""
echo "🤖 Now opening with Playwright..."

# This echo will be picked up by Claude Code to trigger Playwright
echo "CLAUDE_ACTION:OPEN_URL:$LATEST_URL"