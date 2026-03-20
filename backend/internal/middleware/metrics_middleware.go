package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/monitoring"
)

// MetricsMiddleware records Prometheus HTTP metrics for every request.
// Uses c.FullPath() (e.g. "/api/v1/alerts/:id") rather than the raw URL so that
// cardinality stays bounded regardless of path parameter values.
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		duration := time.Since(start).Seconds()
		status := c.Writer.Status()
		endpoint := c.FullPath()
		if endpoint == "" {
			endpoint = "unknown"
		}

		monitoring.RecordHTTPRequest(c.Request.Method, endpoint, status, duration)
	}
}
