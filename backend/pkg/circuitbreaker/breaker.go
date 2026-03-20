// Package circuitbreaker provides a reusable Sony gobreaker wrapper for
// protecting external service calls (FCM, Twilio, Google Maps, etc.).
package circuitbreaker

import (
	"fmt"
	"time"

	"github.com/sony/gobreaker"
)

// Breaker wraps a gobreaker.CircuitBreaker with named helpers.
type Breaker struct {
	cb *gobreaker.CircuitBreaker
}

// Settings holds optional overrides for the circuit breaker configuration.
type Settings struct {
	Name        string
	MaxRequests uint32        // max requests allowed in half-open state (default 3)
	Interval    time.Duration // stat window in closed state (default 60s)
	Timeout     time.Duration // time to wait before half-open after trip (default 30s)
	TripRatio   float64       // failure ratio to trip (default 0.6)
	MinRequests uint32        // minimum requests before evaluating ratio (default 3)
}

// New creates a new Breaker with the given settings.
func New(s Settings) *Breaker {
	if s.MaxRequests == 0 {
		s.MaxRequests = 3
	}
	if s.Interval == 0 {
		s.Interval = 60 * time.Second
	}
	if s.Timeout == 0 {
		s.Timeout = 30 * time.Second
	}
	if s.TripRatio == 0 {
		s.TripRatio = 0.6
	}
	if s.MinRequests == 0 {
		s.MinRequests = 3
	}

	cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
		Name:        s.Name,
		MaxRequests: s.MaxRequests,
		Interval:    s.Interval,
		Timeout:     s.Timeout,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			if counts.Requests < uint32(s.MinRequests) {
				return false
			}
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return failureRatio >= s.TripRatio
		},
		OnStateChange: func(name string, from, to gobreaker.State) {
			// In production, emit a metric or alert here
			fmt.Printf("[circuit-breaker] %s: %s → %s\n", name, from, to)
		},
	})

	return &Breaker{cb: cb}
}

// NewDefault creates a Breaker with sensible defaults for the given service name.
func NewDefault(name string) *Breaker {
	return New(Settings{Name: name})
}

// Execute runs fn through the circuit breaker. Returns ErrCircuitOpen when tripped.
func (b *Breaker) Execute(fn func() error) error {
	_, err := b.cb.Execute(func() (interface{}, error) {
		return nil, fn()
	})
	return err
}

// ExecuteWithResult runs fn through the circuit breaker and returns the result value.
func (b *Breaker) ExecuteWithResult(fn func() (interface{}, error)) (interface{}, error) {
	return b.cb.Execute(func() (interface{}, error) {
		return fn()
	})
}

// State returns the current circuit breaker state ("closed", "open", "half-open").
func (b *Breaker) State() string {
	return b.cb.State().String()
}

// =============================================================================
// Pre-wired breakers for SafeAround external services
// =============================================================================

var (
	FCMBreaker    = NewDefault("FCM_API")
	TwilioBreaker = NewDefault("TWILIO_API")
	MapsBreaker   = New(Settings{
		Name:        "GOOGLE_MAPS_API",
		MaxRequests: 5,
		Timeout:     60 * time.Second,
		TripRatio:   0.5,
	})
	ESBreaker = New(Settings{
		Name:        "ELASTICSEARCH",
		MaxRequests: 3,
		TripRatio:   0.7,
		Timeout:     20 * time.Second,
	})
)
