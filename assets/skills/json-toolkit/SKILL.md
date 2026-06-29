---
name: JSON Toolkit
description: Format, validate, or minify JSON text.
type: js
---
Use this skill when the user needs to pretty-print, compress, or check JSON.

Call `run_js` with a JSON string in `data` containing:
- `action`: `format`, `minify`, or `validate`
- `text`: the raw JSON string to process

Summarize the outcome for the user. For `validate`, report whether the JSON is valid and include the parser error message when it is not.
