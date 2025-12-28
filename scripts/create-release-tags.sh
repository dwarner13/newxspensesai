#!/bin/bash
# Create Release Tags for Days 6-9
# Run this AFTER merging PRs to main

set -e

echo "=== Creating Release Tags ==="
echo ""

# Ensure we're on main and up to date
git checkout main
git pull origin main

# Day 6: Employee Routing
echo "Creating tag v0.6.0 for Day 6..."
git tag -a v0.6.0 -m "Release: Day 6 - Employee Routing (Prime/Crystal/Tag/Byte)"
echo "✅ Tag v0.6.0 created"

# Day 7: Streaming Polish
echo "Creating tag v0.7.0 for Day 7..."
git tag -a v0.7.0 -m "Release: Day 7 - Streaming Polish + Header Unification"
echo "✅ Tag v0.7.0 created"

# Day 8: OCR Ingestion
echo "Creating tag v0.8.0 for Day 8..."
git tag -a v0.8.0 -m "Release: Day 8 - OCR & Ingestion (Phase 1)"
echo "✅ Tag v0.8.0 created"

# Day 9: OCR Normalize & Categorize
echo "Creating tag v0.9.0 for Day 9..."
git tag -a v0.9.0 -m "Release: Day 9 - OCR Normalize → Categorize → Store"
echo "✅ Tag v0.9.0 created"

# Push all tags
echo ""
echo "Pushing tags to remote..."
git push --tags

echo ""
echo "=== Release Tags Created ==="
echo ""
echo "v0.6.0 - Day 6: Employee Routing"
echo "v0.7.0 - Day 7: Streaming Polish"
echo "v0.8.0 - Day 8: OCR Ingestion"
echo "v0.9.0 - Day 9: OCR Normalize & Categorize"
echo ""
echo "All tags pushed to origin."

