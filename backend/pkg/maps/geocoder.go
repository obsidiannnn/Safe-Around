package maps

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/obsidiannnn/Safe-Around/backend/pkg/logger"
	"github.com/sony/gobreaker"
	"go.uber.org/zap"
)

type Client struct {
	apiKey string
	cb     *gobreaker.CircuitBreaker
}

type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type GeocodeResponse struct {
	Status  string `json:"status"`
	Results []struct {
		FormattedAddress string `json:"formatted_address"`
		Geometry         struct {
			Location LatLng `json:"location"`
		} `json:"geometry"`
	} `json:"results"`
}

func NewClient(apiKey string) *Client {
	cbSettings := gobreaker.Settings{
		Name:        "GOOGLE_MAPS_API",
		MaxRequests: 5,
		Interval:    20 * time.Second,
		Timeout:     10 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 5 && failureRatio >= 0.5
		},
	}

	return &Client{
		apiKey: apiKey,
		cb:     gobreaker.NewCircuitBreaker(cbSettings),
	}
}

// GeocodeAddress converts "1600 Amphitheatre Parkway" into {Lat, Lng}
func (c *Client) GeocodeAddress(address string) (*LatLng, error) {
	endpoint := fmt.Sprintf("https://maps.googleapis.com/maps/api/geocode/json?address=%s&key=%s", url.QueryEscape(address), c.apiKey)
	
	resp, err := c.executeAPI(endpoint)
	if err != nil {
		return nil, err
	}

	if len(resp.Results) == 0 {
		return nil, errors.New("address not found or resolved by maps api")
	}

	return &resp.Results[0].Geometry.Location, nil
}

// ReverseGeocode converts Lat/Lng into "1600 Amphitheatre Parkway"
func (c *Client) ReverseGeocode(lat, lng float64) (string, error) {
	endpoint := fmt.Sprintf("https://maps.googleapis.com/maps/api/geocode/json?latlng=%.8f,%.8f&key=%s", lat, lng, c.apiKey)

	resp, err := c.executeAPI(endpoint)
	if err != nil {
		return "", err
	}

	if len(resp.Results) == 0 {
		return "", errors.New("reverse geocode lookup yielded no results")
	}

	return resp.Results[0].FormattedAddress, nil
}

func (c *Client) executeAPI(endpoint string) (*GeocodeResponse, error) {
	res, err := c.cb.Execute(func() (interface{}, error) {
		client := &http.Client{Timeout: 5 * time.Second}
		httpResp, err := client.Get(endpoint)
		if err != nil {
			return nil, err
		}
		defer httpResp.Body.Close()

		var data GeocodeResponse
		if err := json.NewDecoder(httpResp.Body).Decode(&data); err != nil {
			return nil, err
		}

		if data.Status != "OK" && data.Status != "ZERO_RESULTS" {
			logger.Error("Google Maps API Warning", zap.String("status", data.Status))
			if data.Status == "OVER_QUERY_LIMIT" || data.Status == "REQUEST_DENIED" {
				return nil, fmt.Errorf("maps api error: %s", data.Status)
			}
		}

		return &data, nil
	})

	if err != nil {
		return nil, err
	}
	return res.(*GeocodeResponse), nil
}
