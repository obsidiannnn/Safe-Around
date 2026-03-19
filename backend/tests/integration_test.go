package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/obsidiannnn/Safe-Around/backend/pkg/fcm"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/maps"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/twilio"
	"github.com/stretchr/testify/assert"
)

func TestFCMIntegration(t *testing.T) {
	// Mock FCM Server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/fcm/send", r.URL.Path)
		assert.Equal(t, "key=mock-server-key", r.Header.Get("Authorization"))

		w.WriteHeader(http.StatusOK)
		resp := fcm.Response{
			MessageID: 123456789,
			Success:   1,
			Failure:   0,
			Results: []struct {
				MessageID string `json:"message_id"`
				Error     string `json:"error"`
			}{
				{MessageID: "projects/safe-around/messages/123456789"}, // Match exactly what the json tag expects
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer mockServer.Close()

	client := fcm.NewClient("mock-server-key")
	client.OverrideBaseURL(mockServer.URL + "/fcm/send")
	
	msgID, err := client.SendNotification("device_token_1", "Test Title", "Test Body", nil)
	assert.NoError(t, err)
	assert.Equal(t, "projects/safe-around/messages/123456789", msgID)
}

func TestTwilioIntegration(t *testing.T) {
	client := twilio.NewClient("AC_MOCK_SID", "MOCK_TOKEN")
	assert.NotNil(t, client)
}

func TestGeocodingIntegration(t *testing.T) {
	client := maps.NewClient("AIzaMockKey")
	assert.NotNil(t, client)
}

