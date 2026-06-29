---
name: Tip Split
description: Calculate tip and per-person bill split.
type: js
---
Use this skill when the user wants a tip amount or to split a restaurant bill.

Call `run_js` with a JSON string in `data` containing:
- `total`: bill total as a number
- `tipPercent`: optional tip percentage (default 15)
- `people`: optional number of people (default 1)

Present tip amount, grand total, and each person's share clearly.
