# Post-Merge Release Tags

**Date**: 2025-01-XX  
**Branch**: `main`

---

## Release Tag Mapping

| Day | PR Branch | Tag | Label |
|-----|-----------|-----|-------|
| 6 | `feature/day6-employee-routing` | `v0.6.0` | Employee Routing (Prime/Crystal/Tag/Byte) |
| 7 | `feature/day7-streaming-polish` | `v0.7.0` | Streaming Polish + Header Unification |
| 8 | `feature/day8-ocr-ingestion` | `v0.8.0` | OCR & Ingestion (Phase 1) |
| 9 | `feature/day9-ocr-normalize-categorize` | `v0.9.0` | OCR Normalize → Categorize → Store |
| 10 | `feature/day10-ocr-memory-xp` | `v1.0.0` | OCR ↔ Memory Matching + Vendor Aliases + XP Engine |

---

## Commands to Run After Each Merge

### After Day 6 Merge:

```bash
git checkout main && git pull
git tag -a v0.6.0 -m "Release: Day 6 - Employee Routing (Prime/Crystal/Tag/Byte)"
git push --tags
```

### After Day 7 Merge:

```bash
git checkout main && git pull
git tag -a v0.7.0 -m "Release: Day 7 - Streaming Polish + Header Unification"
git push --tags
```

### After Day 8 Merge:

```bash
git checkout main && git pull
git tag -a v0.8.0 -m "Release: Day 8 - OCR & Ingestion (Phase 1)"
git push --tags
```

### After Day 9 Merge:

```bash
git checkout main && git pull
git tag -a v0.9.0 -m "Release: Day 9 - OCR Normalize → Categorize → Store"
git push --tags
```

### After Day 10 Merge:

```bash
git checkout main && git pull
git tag -a v1.0.0 -m "Release: Day 10 - OCR ↔ Memory Matching + Vendor Aliases + XP Engine"
git push --tags
```

---

## Verify Tags

```bash
# List all tags
git tag -l "v0.*" "v1.0.0"

# View tag details
git show v0.6.0
git show v0.7.0
git show v0.8.0
git show v0.9.0
git show v1.0.0
```

---

## Expected Tags

After all merges complete:

- ✅ `v0.6.0` - Day 6 - Employee Routing
- ✅ `v0.7.0` - Day 7 - Streaming Polish
- ✅ `v0.8.0` - Day 8 - OCR Ingestion
- ✅ `v0.9.0` - Day 9 - OCR Normalize & Categorize
- ✅ `v1.0.0` - Day 10 - OCR Memory & XP

---

## Note

If tags already exist, skip the tag creation step or use `-f` flag (not recommended):

```bash
git tag -a -f v0.6.0 -m "Release: Day 6 - Employee Routing (Prime/Crystal/Tag/Byte)"
git push --tags --force
```

**Recommended**: Check existing tags first and adjust version numbers if needed.

