#!/bin/bash
# Deploy to PRODUCTION (MVP) environment
# ⚠️  WARNING: This deploys to LIVE USERS at commitment-app-mvp.vercel.app

set -e  # Exit on error

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   ⚠️  WARNING: PRODUCTION DEPLOYMENT ⚠️                    ║"
echo "║                                                            ║"
echo "║   You are about to deploy to LIVE PRODUCTION:             ║"
echo "║   https://commitment-app-mvp.vercel.app                   ║"
echo "║                                                            ║"
echo "║   This will affect REAL USERS immediately!                ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Type 'YES I WANT TO DEPLOY TO PRODUCTION' to continue"
echo -n "> "
read confirmation

if [ "$confirmation" != "YES I WANT TO DEPLOY TO PRODUCTION" ]; then
    echo ""
    echo "❌ Deployment cancelled. Good choice!"
    echo "   Use ./deploy-dev.sh for dev deployments"
    exit 1
fi

echo ""
echo "============================================"
echo "  DEPLOYING TO PRODUCTION (MVP)"
echo "  Target: commitment-app-mvp.vercel.app"
echo "============================================"
echo ""

# Step 1: Link to MVP project
echo "📦 Linking to MVP project..."
vercel link --project=commitment-app-mvp --scope=pietpaulismas-projects --yes

# Step 2: Build
echo ""
echo "🔨 Building project..."
npm run build

# Step 3: Deploy to production
echo ""
echo "🚀 Deploying to PRODUCTION..."
vercel --prod --yes

echo ""
echo "============================================"
echo "✅ DEPLOYED TO PRODUCTION SUCCESSFULLY"
echo "   URL: https://commitment-app-mvp.vercel.app"
echo "   ⚠️  LIVE USERS ARE NOW USING THIS VERSION"
echo "============================================"
