---
name: Encode Tool
description: Base64 and URI encode or decode text.
type: js
---
Use this skill when the user needs to encode or decode Base64 or URI component strings.

Call `run_js` with a JSON string in `data` containing:
- `action`: `base64_encode`, `base64_decode`, `uri_encode`, or `uri_decode`
- `text`: the input string

Return the transformed output or explain decode errors briefly.
