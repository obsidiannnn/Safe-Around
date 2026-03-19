package middleware

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/handlers"
	"github.com/redis/go-redis/v9"
)

// RateLimit implements a sliding window counter via Redis
func RateLimit(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		endpoint := c.FullPath()
		if endpoint == "" {
			endpoint = "unknown"
		}
		
		key := "ratelimit:" + endpoint + ":" + ip
		ctx := context.Background()

		// Retrieve current counter
		current, err := rdb.Get(ctx, key).Int()
		if err != nil && err != redis.Nil {
			// Redis failure, allow through (fail open)
			c.Next()
			return
		}

		// Deny request if limit exceeded
		if current >= limit {
			c.Writer.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
			c.Writer.Header().Set("X-RateLimit-Remaining", "0")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, handlers.ErrorResponse("RATE_LIMIT_EXCEEDED", "too many requests, please slow down"))
			return
		}

		// Increment and refresh TTL dynamically in a transaction
		pipe := rdb.TxPipeline()
		pipe.Incr(ctx, key)
		if current == 0 {
			pipe.Expire(ctx, key, window)
		}
		_, err = pipe.Exec(ctx)
		if err != nil {
			c.Next()
			return
		}

		c.Writer.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Writer.Header().Set("X-RateLimit-Remaining", strconv.Itoa(limit-(current+1)))
		c.Next()
	}
}
