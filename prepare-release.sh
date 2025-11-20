#!/bin/bash

# Commitment App - Release Preparation Script
# This script helps prepare a production release by:
# 1. Checking current version
# 2. Helping update CHANGELOG.md
# 3. Creating a git tag
# 4. Reminding about deployment steps

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "============================================"
echo "  🚀 PRODUCTION RELEASE PREPARATION"
echo "============================================"
echo ""

# Check if we're on dev branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
  echo -e "${RED}⚠️  Warning: You're not on the 'dev' branch!${NC}"
  echo "Current branch: $CURRENT_BRANCH"
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Get current version from package.json
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
echo -e "${BLUE}Current version in package.json: ${GREEN}v${CURRENT_VERSION}${NC}"
echo ""

# Check if CHANGELOG has unreleased changes
if ! grep -q "## \[Unreleased\]" CHANGELOG.md; then
  echo -e "${RED}⚠️  No [Unreleased] section found in CHANGELOG.md${NC}"
  echo "Please add changes to CHANGELOG.md first"
  exit 1
fi

# Show unreleased changes
echo -e "${YELLOW}📋 Unreleased changes in CHANGELOG.md:${NC}"
echo ""
sed -n '/## \[Unreleased\]/,/^---$/p' CHANGELOG.md
echo ""

# Ask if version is correct
echo -e "${YELLOW}Is v${CURRENT_VERSION} the correct version for this release?${NC}"
read -p "Continue with v${CURRENT_VERSION}? (Y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Nn]$ ]]; then
  echo ""
  echo "Please update version in package.json first, then run this script again"
  exit 1
fi

# Get today's date
TODAY=$(date +"%Y-%m-%d")

echo ""
echo -e "${YELLOW}📝 Updating CHANGELOG.md...${NC}"

# Create temp file with updated changelog
TEMP_FILE=$(mktemp)

# Read through CHANGELOG and update
awk -v version="$CURRENT_VERSION" -v date="$TODAY" '
  /^## \[Unreleased\]/ {
    print "## [Unreleased]"
    print ""
    print "No unreleased changes yet."
    print ""
    print "---"
    print ""
    print "## [" version "] - " date
    in_unreleased = 1
    next
  }
  /^---$/ && in_unreleased {
    print ""
    print "---"
    in_unreleased = 0
    next
  }
  /^## \[/ && in_unreleased {
    print ""
    print "---"
    print ""
    print $0
    in_unreleased = 0
    next
  }
  /^No unreleased changes yet/ && in_unreleased {
    next
  }
  { print }
' CHANGELOG.md > "$TEMP_FILE"

# Replace original with updated version
mv "$TEMP_FILE" CHANGELOG.md

echo -e "${GREEN}✅ CHANGELOG.md updated${NC}"
echo ""

# Show what will be committed
echo -e "${YELLOW}📄 Files to commit:${NC}"
echo "  - CHANGELOG.md"
echo "  - package.json (version already at v${CURRENT_VERSION})"
echo ""

# Ask to create git tag
echo -e "${YELLOW}Would you like to:${NC}"
echo "  1. Commit CHANGELOG.md"
echo "  2. Create git tag v${CURRENT_VERSION}"
echo "  3. Show next steps"
echo ""
read -p "Proceed? (Y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  # Commit the changelog
  git add CHANGELOG.md
  git commit -m "Update CHANGELOG for v${CURRENT_VERSION} release"
  echo -e "${GREEN}✅ CHANGELOG.md committed${NC}"
  echo ""

  # Create git tag
  git tag -a "v${CURRENT_VERSION}" -m "Release v${CURRENT_VERSION}"
  echo -e "${GREEN}✅ Git tag v${CURRENT_VERSION} created${NC}"
  echo ""
fi

# Show next steps
echo ""
echo "============================================"
echo "  ✅ RELEASE PREPARED: v${CURRENT_VERSION}"
echo "============================================"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "  1. Review the changes:"
echo "     ${BLUE}git show HEAD${NC}"
echo ""
echo "  2. Push to dev branch:"
echo "     ${BLUE}git push origin dev${NC}"
echo ""
echo "  3. Push the tag:"
echo "     ${BLUE}git push origin v${CURRENT_VERSION}${NC}"
echo ""
echo "  4. Merge to main and deploy to production:"
echo "     ${BLUE}git checkout main${NC}"
echo "     ${BLUE}git merge dev${NC}"
echo "     ${BLUE}git push origin main${NC}"
echo "     ${BLUE}./deploy-mvp.sh${NC}"
echo ""
echo "  5. After deployment, start next version:"
echo "     ${BLUE}git checkout dev${NC}"
echo "     Update version in ${BLUE}package.json${NC}"
echo ""
echo "============================================"
echo ""
