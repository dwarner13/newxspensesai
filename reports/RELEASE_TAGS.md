# Release Tags Guide (Days 6-9)

**Purpose**: Create release tags after merging PRs to main

---

## PR MERGE ORDER

1. **Day 6** → `main` (prerequisite for Day 7+)
2. **Day 7** → `main` (prerequisite for Day 8+)
3. **Day 8** → `main` (prerequisite for Day 9)
4. **Day 9** → `main`

---

## TAG CREATION COMMANDS

After each PR is merged and CI is green:

### Day 6: Employee Routing
```bash
git checkout main
git pull origin main
git tag -a v0.6.0 -m "Release: Day 6 - Employee Routing (Prime/Crystal/Tag/Byte)"
git push --tags
```

### Day 7: Streaming Polish
```bash
git checkout main
git pull origin main
git tag -a v0.7.0 -m "Release: Day 7 - Streaming Polish + Header Unification"
git push --tags
```

### Day 8: OCR Ingestion
```bash
git checkout main
git pull origin main
git tag -a v0.8.0 -m "Release: Day 8 - OCR & Ingestion (Phase 1)"
git push --tags
```

### Day 9: OCR Normalize & Categorize
```bash
git checkout main
git pull origin main
git tag -a v0.9.0 -m "Release: Day 9 - OCR Normalize → Categorize → Store"
git push --tags
```

---

## BATCH TAG CREATION

Alternatively, use the script after all PRs are merged:

```bash
chmod +x scripts/create-release-tags.sh
./scripts/create-release-tags.sh
```

---

## VERIFICATION

After creating tags, verify:

```bash
git tag -l "v0.*"
```

Should show:
- v0.6.0
- v0.7.0
- v0.8.0
- v0.9.0

---

## TAG NOTES

- Tags are annotated (`-a` flag) for better release notes
- Tags point to merge commits on `main`
- Tags can be viewed on GitHub Releases page
- Tags follow semantic versioning (v0.X.0)

---

## PR LINKS (for reference)

- Day 6: https://github.com/dwarner13/newxspensesai/compare/main...feature/day6-employee-routing
- Day 7: https://github.com/dwarner13/newxspensesai/compare/main...feature/day7-streaming-polish
- Day 8: https://github.com/dwarner13/newxspensesai/compare/main...feature/day8-ocr-ingestion
- Day 9: https://github.com/dwarner13/newxspensesai/compare/main...feature/day9-ocr-normalize-categorize

