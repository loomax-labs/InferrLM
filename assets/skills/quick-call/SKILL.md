---
name: Quick Call
description: Open the phone dialer with a confirmed number.
type: text
---
Use this skill when the user wants to call a phone number.

Before calling:
1. Repeat the full number back to the user and ask for explicit confirmation.
2. Do not call emergency numbers unless the user clearly requests emergency help.

After confirmation, call `run_intent` with:
- `intent`: `call_phone`
- `parameters`: a JSON object with:
  - `phoneNumber`: the confirmed phone number as a string

Tell the user the dialer was opened.
