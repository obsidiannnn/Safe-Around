package monitoring

import (
	"fmt"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Prometheus Metrics Registry for SafeAround
// All counters/gauges/histograms are auto-registered via promauto.


var (
	// ---- HTTP ----

	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "safearound_http_requests_total",
			Help: "Total number of HTTP requests broken down by method, endpoint, and status.",
		},
		[]string{"method", "endpoint", "status"},
	)

	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "safearound_http_request_duration_seconds",
			Help:    "HTTP request duration in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// ---- Emergency Alerts ----

	AlertsCreated = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "safearound_alerts_created_total",
			Help: "Total number of emergency alerts created.",
		},
	)

	AlertsResolved = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "safearound_alerts_resolved_total",
			Help: "Total number of emergency alerts resolved.",
		},
	)

	AlertResponseTime = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "safearound_alert_response_time_seconds",
			Help:    "Elapsed seconds from alert creation to first responder response.",
			Buckets: []float64{5, 10, 30, 60, 120, 300, 600},
		},
	)

	ActiveAlerts = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "safearound_active_alerts",
			Help: "Number of currently active (unresolved) emergency alerts.",
		},
	)

	// ---- WebSocket ----

	WebSocketConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "safearound_websocket_connections",
			Help: "Number of currently open WebSocket connections.",
		},
	)

	WebSocketMessagesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "safearound_websocket_messages_total",
			Help: "Total WebSocket messages sent, labelled by event type.",
		},
		[]string{"event_type"},
	)

	// ---- Database ----

	DatabaseConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "safearound_db_connections_active",
			Help: "Number of active database connections in the pool.",
		},
	)

	DatabaseQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "safearound_db_query_duration_seconds",
			Help:    "Database query execution duration in seconds.",
			Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0},
		},
		[]string{"query_type"},
	)

	// ---- Cache (Redis) ----

	CacheHitsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "safearound_cache_hits_total",
			Help: "Total cache hits.",
		},
		[]string{"cache_type"},
	)

	CacheMissesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "safearound_cache_misses_total",
			Help: "Total cache misses.",
		},
		[]string{"cache_type"},
	)

	// ---- Notifications ----

	NotificationsSentTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "safearound_notifications_sent_total",
			Help: "Total outbound notifications successfully dispatched.",
		},
		[]string{"channel", "type"},
	)

	NotificationsFailedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "safearound_notifications_failed_total",
			Help: "Total outbound notifications that failed after all retries.",
		},
		[]string{"channel", "type"},
	)

	// ---- Background Jobs ----

	JobExecutionsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "safearound_job_executions_total",
			Help: "Total cron job executions.",
		},
		[]string{"job_name", "status"}, // status: success | failure
	)

	JobDurationSeconds = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "safearound_job_duration_seconds",
			Help:    "Cron job execution duration in seconds.",
			Buckets: []float64{0.1, 0.5, 1, 5, 10, 30, 60, 300},
		},
		[]string{"job_name"},
	)
)

// =============================================================================
// Helper functions
// =============================================================================

// RecordHTTPRequest records a single HTTP request with its method, path, status, and elapsed duration.
func RecordHTTPRequest(method, endpoint string, status int, duration float64) {
	HTTPRequestsTotal.WithLabelValues(method, endpoint, fmt.Sprintf("%d", status)).Inc()
	HTTPRequestDuration.WithLabelValues(method, endpoint).Observe(duration)
}

// RecordAlertCreated increments the created counter and the active gauge.
func RecordAlertCreated() {
	AlertsCreated.Inc()
	ActiveAlerts.Inc()
}

// RecordAlertResolved records resolution and the time-to-first-response.
func RecordAlertResolved(responseTimeSec float64) {
	AlertsResolved.Inc()
	ActiveAlerts.Dec()
	AlertResponseTime.Observe(responseTimeSec)
}

// RecordCacheHit increments the hit counter for the given cache type.
func RecordCacheHit(cacheType string) {
	CacheHitsTotal.WithLabelValues(cacheType).Inc()
}

// RecordCacheMiss increments the miss counter for the given cache type.
func RecordCacheMiss(cacheType string) {
	CacheMissesTotal.WithLabelValues(cacheType).Inc()
}

// RecordNotification records a sent or failed notification for the given channel and type.
func RecordNotification(channel, notifType string, failed bool) {
	if failed {
		NotificationsFailedTotal.WithLabelValues(channel, notifType).Inc()
	} else {
		NotificationsSentTotal.WithLabelValues(channel, notifType).Inc()
	}
}

// RecordJobExecution records a cron job result and its execution duration.
func RecordJobExecution(jobName string, durationSec float64, err error) {
	status := "success"
	if err != nil {
		status = "failure"
	}
	JobExecutionsTotal.WithLabelValues(jobName, status).Inc()
	JobDurationSeconds.WithLabelValues(jobName).Observe(durationSec)
}
