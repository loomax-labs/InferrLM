---
name: Quick SMS
description: Draft an SMS to a confirmed phone number.
type: text
---
Use this skill when the user wants to send a text message.

Before sending:
1. Confirm the recipient phone number with the user.
2. Show the message body and ask for explicit confirmation.

After confirmation, call `run_intent` with:
- `intent`: `send_sms`
- `parameters`: a JSON object with:
  - `phoneNumber`: the confirmed phone number as a string
  - `body`: the message text as a string

Tell the user the SMS composer was opened.
