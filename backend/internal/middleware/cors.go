package middleware

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// CorsMiddleware handles Cross-Origin Resource Sharing.
// It reads the ALLOWED_ORIGINS env var (comma-separated) and falls back to
// a safe set of development origins.
func CorsMiddleware() gin.HandlerFunc {
	allowedOrigins := buildAllowedOrigins()

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check if the request origin is in the whitelist
		allowed := isAllowedOrigin(origin, allowedOrigins)
		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			// Reject cross-origin requests from unknown origins in production;
			// in development allow all for convenience.
			if gin.Mode() != gin.DebugMode {
				c.Next()
				return
			}
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers",
			"Content-Type, Content-Length, Authorization, Accept, Origin, X-Request-ID, X-Requested-With, Cache-Control")
		c.Writer.Header().Set("Access-Control-Expose-Headers",
			"Content-Length, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-ID")
		c.Writer.Header().Set("Access-Control-Max-Age", "43200") // 12 hours

		// Respond to pre-flight
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func buildAllowedOrigins() []string {
	base := []string{
		// Web & local dev
		"http://localhost:3000",
		"http://localhost:19006",
		"http://localhost:8081",
		// Expo Go on LAN (Android emulator)
		"http://10.0.2.2:8081",
		// Expo Go on LAN (iOS simulator)
		"http://localhost:19000",
		// Production
		"https://safearound.app",
		"https://api.safearound.app",
	}

	if env := os.Getenv("ALLOWED_ORIGINS"); env != "" {
		for _, o := range strings.Split(env, ",") {
			trimmed := strings.TrimSpace(o)
			if trimmed != "" {
				base = append(base, trimmed)
			}
		}
	}
	return base
}

func isAllowedOrigin(origin string, allowed []string) bool {
	if origin == "" {
		return false
	}
	for _, a := range allowed {
		if a == origin {
			return true
		}
		// Wildcard sub-domain support: "*.safearound.app"
		if strings.HasPrefix(a, "*.") {
			suffix := a[1:] // ".safearound.app"
			if strings.HasSuffix(origin, suffix) {
				return true
			}
		}
	}
	return false
}

// CorsMaxAge returns the CORS preflight max-age as a Duration.
func CorsMaxAge() time.Duration { return 12 * time.Hour }
