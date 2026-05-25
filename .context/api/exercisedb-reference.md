# ExerciseDB / AscendAPI — Quick Reference

## OSS Free API (v0 development)
Base URL: `https://oss.exercisedb.dev/api/v1`
Auth: None required
Exercises: ~1,500
Media: 180p GIFs
Rate limit: Undocumented (be polite, 200ms delay)
License: Non-commercial only

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /exercises?limit=25&after=CURSOR | Paginated exercises (max 25/page) |
| GET | /exercises/{exerciseId} | Single exercise |
| GET | /exercises/search?search=QUERY | Fuzzy search (returns lightweight results) |
| GET | /bodyparts | List body part names |
| GET | /muscles | List muscle names |
| GET | /equipments | List equipment names |

### Exercise Object (OSS)
```json
{
  "exerciseId": "EIeI8Vf",
  "name": "barbell bench press",
  "bodyParts": ["chest"],
  "equipments": ["barbell"],
  "targetMuscles": ["pectorals"],
  "secondaryMuscles": ["triceps", "shoulders"],
  "gifUrl": "https://static.exercisedb.dev/media/EIeI8Vf.gif",
  "instructions": ["Step:1 Lie flat...", "Step:2 Grip..."]
}
```

## V2 Pro API (production)
Base URL: `https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1`
Auth: `X-RapidAPI-Key` + `X-RapidAPI-Host` headers
Exercises: 11,000+
Media: HD images (360/480/720/1080) + MP4 videos
Cost: $100/mo (80K req/mo)

### Additional V2 Fields
- `exerciseType`: "strength", "cardio", "flexibility"
- `overview`: Coaching paragraph
- `exerciseTips`: Pro tips array
- `variations`: Variation names
- `relatedExerciseIds`: Substitution graph
- `videoUrl`: MP4 video URL
- `imageUrls`: { "360", "480", "720", "1080" }
- `keywords`: Search keywords

## Import Script
```bash
# OSS (no key needed)
DATABASE_URL=postgresql://... npx tsx scripts/import-exercisedb.ts

# V2 Pro
DATABASE_URL=postgresql://... EXERCISEDB_API_KEY=xxx npx tsx scripts/import-exercisedb.ts

# Dry run (no DB writes)
DATABASE_URL=postgresql://... npx tsx scripts/import-exercisedb.ts --dry-run
```
