# Device Model (A.3)

Each session may reference one `iam_devices` row.

| Field | Source |
|-------|--------|
| name | `{browser} on {os}` |
| browser | Parsed User-Agent |
| os | Parsed User-Agent |
| platform | windows/macos/ios/android/linux |
| deviceType | desktop/mobile/tablet/unknown |
| fingerprintKey | Hash of browser+os+type+UA prefix |

Non-invasive: uses request headers only. No canvas/WebGL fingerprinting.
