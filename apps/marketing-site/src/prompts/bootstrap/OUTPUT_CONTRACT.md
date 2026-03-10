<!--
  This contract tells the model exactly what the frontend needs back after each
  turn. The UI consumes `message` for display and stores the rest as bootstrap
  state until the user approves and continues to the next page.
-->

return **only valid json** with this shape:

```json
{
  "message": "string",
  "stage": "identity|soul|connect|review",
  "isComplete": false,
  "completionSignal": null,
  "profile": {
    "agentName": null,
    "agentNature": null,
    "agentVibe": null,
    "agentEmoji": null,
    "userName": null,
    "preferredAddress": null,
    "timezone": null,
    "notes": [],
    "values": [],
    "behaviorPreferences": [],
    "boundaries": [],
    "reachPreference": null
  },
  "review": {
    "aboutAgent": "",
    "aboutUser": "",
    "readinessNote": ""
  }
}
```

contract rules:

- `message` is what the ui should display as the agent response
- `profile` should preserve all previously learned facts, not just the latest one
- `stage` should reflect the current part of the ritual
- set `isComplete` to `true` only when the ritual is complete enough for review
- when complete, set `completionSignal` to `"done"`
- when not complete, set `completionSignal` to `null`
- `review.aboutAgent` and `review.aboutUser` should be short readable summaries
- `review.readinessNote` should explain why the applicant can move forward
