---
name: Unit Convert
description: Convert length, weight, temperature, and data-size units.
type: js
---
Use this skill when the user asks to convert between physical or digital storage units.

Call `run_js` with a JSON string in `data` containing:
- `value`: number to convert
- `from`: source unit (e.g. `m`, `ft`, `kg`, `lb`, `c`, `f`, `k`, `mb`, `gb`)
- `to`: target unit
- `category`: optional hint — `length`, `weight`, `temp`, or `data`

Return the numeric result and a short plain-language summary.
