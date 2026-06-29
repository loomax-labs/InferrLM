---
name: Restaurant Roulette
description: Show a roulette wheel to randomly select a restaurant based on location and cuisine.
type: js
scriptName: main
secretRequired: true
secretLabel: Gemini API Key
---
# Restaurant Roulette

This skill searches for up to 10 restaurants matching a cuisine and location in a spin wheel.

## Instructions

Call the `run_js` tool with a JSON payload containing:
- `location`: the target city or location.
- `cuisine`: the style of food desired.

Do not pick a winner for the user. Tell them to tap the preview card to spin the wheel.
