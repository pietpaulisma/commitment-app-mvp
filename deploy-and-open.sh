#!/bin/bash

# Deploy and Open Dev Site Script
# Pushes current changes to dev branch and opens the latest deployment URL with Playwright

set -e

echo "🚀 Pushing to dev branch..."
git push origin dev

echo "⏳ Waiting for Vercel deployment to start..."
sleep 15

echo "📋 Fetching latest deployment URL..."
LATEST_URL=$(VERCEL_TOKEN="FrMWJpIinCZ85Jeinfqoiq8t" vercel --token "FrMWJpIinCZ85Jeinfqoiq8t" ls commitment-app-dev --next 0 | head -1 | grep -o 'https://[^[:space:]]*')

echo "🌐 Latest deployment: $LATEST_URL"
echo "🔄 Waiting for deployment to be ready..."
sleep 45

echo "🎯 Opening deployment with Playwright..."

# Write URL to a temp file for Claude to pick up
echo "$LATEST_URL" > /tmp/latest_dev_url.txt
echo "✅ URL written to /tmp/latest_dev_url.txt"
echo "🌐 Ready to open: $LATEST_URL"