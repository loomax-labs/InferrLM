---
name: Mood Music
description: Suggest or play music based on the user's mood using the Loudly API.
type: js
scriptName: main
secretRequired: true
secretLabel: Loudly API Key
---
# Mood Music

## Instructions

### Step 1: Fetch genres
Call `run_js` with `get_genres.html` and `{}`.

### Step 2: Generate music
Map the user's mood to a valid genre from step 1, then call `run_js` with `index.html` and:
- `genre`: exact genre name from step 1
- `duration`: seconds (30-420), default 120
- `energy`: `low`, `high`, or `original`

Tell the user to tap the preview card to play the track.
