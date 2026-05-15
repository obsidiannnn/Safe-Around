# Implementation Plan

## Overview
This spec fixes the SOS emergency alert delivery issue where nearby users are not receiving alert popups on their screens. The fix involves adding comprehensive logging to trace the alert flow, verifying backend broadcasting, checking frontend event handler registration, and fixing any issues found in the pipeline.

## Tasks

- [ ] 1. Add comprehensive logging to debug alert pipeline
  - Add backend logging in `alert_service.go` (CreateAlert, dispatchInitialAlert, nearby users, BroadcastEmergencyAlert call)
  - Add backend logging in `crime_hub.go` (BroadcastEmergencyAlert, JSON payload, connected clients)
  - Add frontend logging in `CrimeWebSocket.ts` (all incoming messages, emergency_alert case, eventData)
  - Add frontend logging in `MapDashboardScreen.tsx` (handler registration, handleEmergencyAlert call, filtering logic, NativeAlert.alert call)
  - All logs prefixed with emoji (🚨 for alerts, 📡 for WebSocket)

- [~] 2. Verify backend alert broadcasting
  - Test nearby user detection (GetDispatchCandidates, requester exclusion, empty list check)
  - Verify WebSocket hub initialization (not nil, BroadcastEmergencyAlert called, clients connected)
  - Check message format (JSON payload, event field, data structure)
  - **Depends on**: 1

- [~] 3. Verify frontend event handler registration
  - Check areMapEnhancementsReady state (when it becomes true, verify before SOS, handlers registered after)
  - Verify event handler registration (CrimeWebSocketService.on called, handler in listeners map, not unregistered)
  - Test with manual event emission (TEST ALERT button, React Native Alert.alert works, no blocking modals)
  - **Depends on**: 1

- [~] 4. Fix WebSocket event delivery issues
  - Fix backend issues if found (dispatchInitialAlert panic recovery, empty recipient handling, WebSocket hub init)
  - Fix frontend issues if found (event name mismatch, data parsing, handler registration timing)
  - Fix timing issues if found (early handler registration, retry logic, race conditions)
  - **Depends on**: 2, 3

- [~] 5. Test and verify alert delivery
  - Test with two devices (different accounts, within 100m, SOS on Device A, alert on Device B within 2s)
  - Verify alert content (correct user name, clear message, Respond button navigation, Dismiss button)
  - Test edge cases (no own alert, multiple nearby users, WebSocket reconnect, app background/foreground)
  - Clean up debug logging (remove verbose logs, keep essential logs, no sensitive data)
  - **Depends on**: 4

## Notes
- Reference working commit: `5ac89cb457b261f8d8400242e7cbe0135b93d077`
- Use simple `NativeAlert.alert()` popups (no complex modals)
- Do NOT change WebSocket connection logic (it's working)
- Keep WebSocket on at all times
- Do NOT disable continuous rendering

## Task Dependency Graph
```
1 (Add logging)
├─> 2 (Verify backend)
│   └─> 4 (Fix issues)
│       └─> 5 (Test and verify)
└─> 3 (Verify frontend)
    └─> 4 (Fix issues)
        └─> 5 (Test and verify)
```
