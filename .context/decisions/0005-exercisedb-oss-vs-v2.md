# ADR 0005: ExerciseDB OSS for v0, V2 Pro for Production

## Status
Accepted (2026-05-25)

## Context
ExerciseDB has rebranded to AscendAPI. Three API tiers exist:
- **OSS (free):** 1,500 exercises, 180p GIFs, no API key, non-commercial only
- **V2 Basic (free via RapidAPI):** 500 exercises, watermarked images, no videos
- **V2 Pro ($100/mo via RapidAPI):** 11,000+ exercises, HD images, MP4 videos, multi-language

Our local-first architecture requires bundling exercise data at build time. AscendAPI's Terms of Service prohibit caching on all paid tiers.

## Decision
- **v0/development:** Use the OSS free API (1,500 exercises, no key needed)
- **Production:** Upgrade to V2 Pro AND negotiate a data licensing/bundling arrangement with AscendAPI (support@ascendapi.com)
- **Types:** Design all types with V2 fields included (nullable). OSS fills them as null. No schema migration needed when upgrading.

## Consequences
- The import pipeline works identically against OSS or V2 (auto-detects based on API key presence)
- V2-only fields (exerciseType, overview, tips, variations, relatedExerciseIds, videoUrl, imageUrls) are null until V2 is enabled
- Before production launch, must resolve the caching/bundling license with AscendAPI
- ADR 0001 (ExerciseDB over Wger) remains valid — the core decision is reinforced by V2's 11,000+ exercise library

## References
- OSS API docs: https://oss.exercisedb.dev/docs
- AscendAPI V2 docs: https://docs.ascendapi.com/products/edb-v2/overview
- V2 RapidAPI listing: https://rapidapi.com/ascendapi/api/edb-with-videos-and-images-by-ascendapi
