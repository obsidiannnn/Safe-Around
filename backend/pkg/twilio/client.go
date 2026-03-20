package twilio

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/obsidiannnn/Safe-Around/backend/pkg/logger"
	"github.com/sony/gobreaker"
	"go.uber.org/zap"
)

type Client struct {
	accountSID string
	authToken  string
	baseURL    string
	cb         *gobreaker.CircuitBreaker
}

type SMSResponse struct {
	Sid          string          `json:"sid"`
	ErrorMessage string          `json:"error_message,omitempty"`
	Status       json.RawMessage `json:"status"`
}

func NewClient(sid, token string) *Client {
	cbSettings := gobreaker.Settings{
		Name:        "TWILIO_API",
		MaxRequests: 3,
		Interval:    30 * time.Second,
		Timeout:     10 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 3 && failureRatio >= 0.5
		},
	}

	return &Client{
		accountSID: sid,
		authToken:  token,
		baseURL:    fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s", sid),
		cb:         gobreaker.NewCircuitBreaker(cbSettings),
	}
}

// SendOTP triggers a Verification Token via Twilio Verify API
func (c *Client) SendOTP(toPhone string, serviceSID string) (string, error) {
	if c.accountSID == "mock" {
		return "mock_sid_12345", nil
	}

	endpoint := fmt.Sprintf("https://verify.twilio.com/v2/Services/%s/Verifications", serviceSID)

	data := url.Values{}
	data.Set("To", toPhone)
	data.Set("Channel", "sms")

	return c.executeRequest(endpoint, data)
}

// MakeCall dispatches a voice hook call via Twilio REST API
func (c *Client) MakeCall(to, from, twimlURL string) (string, error) {
	endpoint := c.baseURL + "/Calls.json"

	data := url.Values{}
	data.Set("To", to)
	data.Set("From", from)
	data.Set("Url", twimlURL)

	return c.executeRequest(endpoint, data)
}

// SendSMS sends an SMS message via the Twilio Messages API.
func (c *Client) SendSMS(to, from, body string) (string, error) {
	endpoint := c.baseURL + "/Messages.json"

	data := url.Values{}
	data.Set("To", to)
	data.Set("From", from)
	data.Set("Body", body)

	return c.executeRequest(endpoint, data)
}

// VerifyOTP checks an OTP token against the Twilio Verify API
func (c *Client) VerifyOTP(toPhone, code, serviceSID string) (bool, error) {
	if c.accountSID == "mock" {
		return code == "123456", nil
	}

	endpoint := fmt.Sprintf("https://verify.twilio.com/v2/Services/%s/VerificationCheck", serviceSID)

	data := url.Values{}
	data.Set("To", toPhone)
	data.Set("Code", code)

	result, err := c.cb.Execute(func() (interface{}, error) {
		req, err := http.NewRequest("POST", endpoint, strings.NewReader(data.Encode()))
		if err != nil {
			return false, err
		}

		req.SetBasicAuth(c.accountSID, c.authToken)
		req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return false, err
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		var apiResp SMSResponse
		if err := json.Unmarshal(body, &apiResp); err != nil {
			return false, err
		}

		// Twilio Verify returns status "approved" for success
		var actualStatus string
		json.Unmarshal(apiResp.Status, &actualStatus)
		
		return actualStatus == "approved", nil
	})

	if err != nil {
		return false, err
	}

	return result.(bool), nil
}

func (c *Client) executeRequest(endpoint string, data url.Values) (string, error) {
	result, err := c.cb.Execute(func() (interface{}, error) {
		req, err := http.NewRequest("POST", endpoint, strings.NewReader(data.Encode()))
		if err != nil {
			return nil, err
		}

		req.SetBasicAuth(c.accountSID, c.authToken)
		req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		var apiResp SMSResponse
		if err := json.Unmarshal(body, &apiResp); err != nil {
			return nil, err
		}

		if resp.StatusCode >= 400 {
			logger.Error("Twilio API Error", zap.String("error", apiResp.ErrorMessage), zap.String("status", string(apiResp.Status)))
			return nil, fmt.Errorf("twilio api error: %s", apiResp.ErrorMessage)
		}

		return apiResp.Sid, nil
	})

	if err != nil {
		return "", err
	}

	return result.(string), nil
}
