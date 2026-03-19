package fcm

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/obsidiannnn/Safe-Around/backend/pkg/logger"
	"github.com/sony/gobreaker"
	"go.uber.org/zap"
)

type Client struct {
	serverKey string
	baseURL   string
	cb        *gobreaker.CircuitBreaker
}

type Payload struct {
	To           string            `json:"to,omitempty"`
	Registration []string          `json:"registration_ids,omitempty"`
	Notification *NotificationItem `json:"notification,omitempty"`
	Data         map[string]string `json:"data,omitempty"`
}

type NotificationItem struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}

type Response struct {
	MessageID    uint64 `json:"message_id"`
	MulticastID  uint64 `json:"multicast_id"`
	Success      int    `json:"success"`
	Failure      int    `json:"failure"`
	CanonicalIDs int    `json:"canonical_ids"`
	Results      []struct {
		MessageID string `json:"message_id"`
		Error     string `json:"error"`
	} `json:"results"`
}

func NewClient(serverKey string) *Client {
	// Configure Circuit Breaker protecting FCM API
	cbSettings := gobreaker.Settings{
		Name:        "FCM_API",
		MaxRequests: 5,
		Interval:    30 * time.Second,
		Timeout:     10 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 3 && failureRatio >= 0.6
		},
	}

	return &Client{
		serverKey: serverKey,
		baseURL:   "https://fcm.googleapis.com/fcm/send",
		cb:        gobreaker.NewCircuitBreaker(cbSettings),
	}
}

// OverrideBaseURL allows injecting a mock server for testing
func (c *Client) OverrideBaseURL(url string) {
	c.baseURL = url
}

func (c *Client) SendNotification(token, title, body string, data map[string]string) (string, error) {
	payload := Payload{
		To: token,
		Notification: &NotificationItem{
			Title: title,
			Body:  body,
		},
		Data: data,
	}

	resp, err := c.executeAPI(payload)
	if err != nil {
		logger.Error("FCM Notification Send Failed", zap.Error(err))
		return "", err
	}

	if resp.Failure > 0 && len(resp.Results) > 0 {
		return "", fmt.Errorf("FCM error: %s", resp.Results[0].Error)
	}

	msgID := ""
	if len(resp.Results) > 0 {
		msgID = resp.Results[0].MessageID
	}
	return msgID, nil
}

func (c *Client) SendMulticast(tokens []string, title, body string, data map[string]string) (*Response, error) {
	if len(tokens) == 0 {
		return nil, errors.New("no device tokens provided")
	}

	payload := Payload{
		Registration: tokens,
		Notification: &NotificationItem{Title: title, Body: body},
		Data:         data,
	}

	return c.executeAPI(payload)
}

// func SendNotification ... left untouched

func (c *Client) executeAPI(payload Payload) (*Response, error) {
	// Wrapper via Circuit Breaker
	result, err := c.cb.Execute(func() (interface{}, error) {
		body, _ := json.Marshal(payload)
		
		req, err := http.NewRequest("POST", c.baseURL, bytes.NewBuffer(body))
		if err != nil {
			return nil, err
		}

		req.Header.Set("Authorization", "key="+c.serverKey)
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 5 * time.Second}
		httpResp, err := client.Do(req)
		
		if err != nil {
			return nil, err
		}
		defer httpResp.Body.Close()

		if httpResp.StatusCode >= 500 {
			return nil, fmt.Errorf("fcm server error: %d", httpResp.StatusCode)
		}

		var fcmResp Response
		if err := json.NewDecoder(httpResp.Body).Decode(&fcmResp); err != nil {
			return nil, err
		}

		return &fcmResp, nil
	})

	if err != nil {
		return nil, err
	}

	return result.(*Response), nil
}
