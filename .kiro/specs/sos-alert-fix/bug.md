# Bug Report: SOS Emergency Alerts Not Appearing on Screen

## Bug Description
When a user triggers an SOS alert, nearby users should receive a popup notification on their screen via WebSocket. Currently, the WebSocket connection is established and working (crime alerts work), but emergency alerts are not appearing on screen for nearby users.

## Expected Behavior
1. User A presses SOS button
2. Backend creates alert and broadcasts via WebSocket to nearby users
3. User B (nearby) receives `emergency_alert` WebSocket event
4. User B sees a React Native Alert popup: "🚨 Emergency Alert Nearby! [User Name] needs urgent help nearby. Open Emergency tab to respond."
5. User B can tap "Respond" to navigate to Emergency tab or "Dismiss" to close

## Actual Behavior
1. User A presses SOS button
2. Backend creates alert (confirmed in logs)
3. WebSocket connection is active (confirmed: "✅ Connected to crime updates via native WebSocket")
4. **No alert popup appears on User B's screen**
5. No console logs showing `🚨 handleEmergencyAlert called with data:` (event handler not being triggered)

## Environment
- **Frontend**: React Native (Expo Go SDK 53)
- **Backend**: Go with WebSocket (Gorilla WebSocket)
- **Database**: Supabase PostgreSQL
- **Network**: Mac IP `10.110.159.25`, Backend port `8001`
- **Test Credentials**: `+919999999999` / `Test@123`

## Reproduction Steps
1. Login with test account on Device A
2. Login with different account on Device B
3. Ensure both devices are within 100m radius (or mock location)
4. On Device A, press SOS button
5. Observe Device B - no alert popup appears

## Known Working State
- Commit `5ac89cb457b261f8d8400242e7cbe0135b93d077` had working alerts using simple `NativeAlert.alert()` popups
- WebSocket connection works (crime alerts appear correctly)
- TEST ALERT button (if added) should show popup to verify React Native alert system works

## Files Involved
- **Frontend**:
  - `frontend/src/screens/map/MapDashboardScreen.tsx` (emergency_alert handler)
  - `frontend/src/services/websocket/CrimeWebSocket.ts` (WebSocket service)
  - `frontend/src/store/alertStore.ts` (alert state management)
  
- **Backend**:
  - `backend/internal/services/alert_service.go` (CreateAlert, dispatchInitialAlert)
  - `backend/internal/websocket/crime_hub.go` (BroadcastEmergencyAlert)

## Constraints
- Do NOT change WebSocket connection logic (it's working)
- Do NOT disable continuous rendering
- Keep WebSocket on at all times
- Use simple `NativeAlert.alert()` popups (no complex modals)
- Reference working commit `5ac89cb457b261f8d8400242e7cbe0135b93d077` for guidance

## Success Criteria
1. When User A triggers SOS, User B receives alert popup within 2 seconds
2. Alert popup shows correct user name and message
3. "Respond" button navigates to Emergency tab
4. "Dismiss" button closes popup
5. User does not see their own alert popup
6. Console logs show `🚨 handleEmergencyAlert called with data:` when event is received
