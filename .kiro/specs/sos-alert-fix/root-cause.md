# Root Cause Analysis: SOS Emergency Alerts Not Appearing

## Hypothesis
The emergency alert WebSocket events are not reaching the frontend event handler, OR the event handler is being called but the React Native Alert is being blocked/suppressed.

## Investigation Areas

### 1. Backend Broadcasting
**Question**: Is the backend actually calling `BroadcastEmergencyAlert` when SOS is created?

**Evidence Needed**:
- Add log in `alert_service.go` → `dispatchInitialAlert()` before calling `BroadcastEmergencyAlert`
- Add log in `crime_hub.go` → `BroadcastEmergencyAlert()` to confirm it's being called
- Verify `recipientUserIDs` array is populated correctly

**Potential Issues**:
- `dispatchInitialAlert` runs in a goroutine and might be panicking silently
- `recipientUserIDs` might be empty (no nearby users found)
- WebSocket hub might be nil

### 2. WebSocket Message Format
**Question**: Is the WebSocket message being sent in the correct format?

**Evidence Needed**:
- Log the exact JSON payload being broadcast from backend
- Verify it matches the format expected by frontend: `{ event: "emergency_alert", data: {...} }`

**Potential Issues**:
- Message format mismatch between backend and frontend
- Missing or incorrect `event` field
- Data structure doesn't match frontend expectations

### 3. Frontend Event Reception
**Question**: Is the frontend receiving the WebSocket message?

**Evidence Needed**:
- Add log in `CrimeWebSocket.ts` → `onmessage` handler to log ALL incoming messages
- Check if `emergency_alert` case is being hit in the switch statement
- Verify `emit('emergency_alert', eventData)` is being called

**Potential Issues**:
- WebSocket message not being parsed correctly
- Event name mismatch (e.g., "emergency_alert" vs "emergencyAlert")
- `eventData` is undefined or malformed

### 4. Frontend Event Handler Registration
**Question**: Is the event handler properly registered when the component mounts?

**Evidence Needed**:
- Verify `useEffect` with `areMapEnhancementsReady` dependency is running
- Check if `CrimeWebSocketService.on('emergency_alert', handleEmergencyAlert)` is being called
- Confirm handler is not being unregistered prematurely

**Potential Issues**:
- `areMapEnhancementsReady` is false, so handlers never register
- Component unmounts/remounts, causing handler to be unregistered
- Multiple registrations causing handler to be called multiple times

### 5. React Native Alert Blocking
**Question**: Is React Native Alert.alert() being blocked or suppressed?

**Evidence Needed**:
- Test with TEST ALERT button to verify Alert.alert() works
- Check if there are any modal overlays blocking alerts
- Verify no other alerts are currently showing (only one alert can show at a time)

**Potential Issues**:
- Another modal is open (e.g., `EmergencyTriggerModal`)
- React Native only allows one alert at a time
- Platform-specific alert blocking (iOS vs Android)

### 6. User Filtering Logic
**Question**: Is the alert being filtered out incorrectly?

**Evidence Needed**:
- Log the comparison: `myAlert.id` vs `data.alert_id`
- Verify the filtering logic doesn't accidentally filter out valid alerts

**Potential Issues**:
- String vs UUID comparison issue
- Alert ID format mismatch
- Logic error in filtering condition

## Most Likely Root Cause
Based on the symptoms (WebSocket works for crime alerts but not emergency alerts), the most likely issues are:

1. **Backend not calling BroadcastEmergencyAlert**: The `dispatchInitialAlert` goroutine might be failing silently
2. **Empty recipient list**: No nearby users found, so no broadcast happens
3. **Event handler not registered**: `areMapEnhancementsReady` might be false when alerts are sent

## Debugging Strategy
1. Add comprehensive logging at each step of the pipeline
2. Test with TEST ALERT button to isolate React Native Alert issues
3. Verify WebSocket message format matches frontend expectations
4. Check if event handler is registered before alert is sent
5. Confirm nearby users are being found correctly
