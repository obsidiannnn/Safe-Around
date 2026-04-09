package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// tierLimits holds the requests-per-minute cap for each subscription tier.
var tierLimits = map[string]int{
	"free":       100,
	"pro":        1000,
	"enterprise": 10000,
}

const (
	defaultLimit = 100
	anonLimit    = 30
)

// RateLimitMiddleware enforces per-user, tier-based rate limits backed by Redis.
// Key format: rate_limit:<userID>:<YYYYMMDDHHMM>  (70s TTL)
// Unauthenticated callers are limited to 30 req/min per IP.
func RateLimitMiddleware(db *gorm.DB, rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")

		if userIDStr == "" {
			if !checkAnonymousLimit(c, rdb) {
				return
			}
			c.Next()
			return
		}

		// Resolve subscription tier from DB (cached by caller via session)
		limit := defaultLimit
		var user models.User
		if err := db.Select("subscription_tier").First(&user, "id = ?", userIDStr).Error; err == nil {
			if l, ok := tierLimits[user.SubscriptionTier]; ok {
				limit = l
			}
		}

		ctx := context.Background()
		key := fmt.Sprintf("rate_limit:%s:%s", userIDStr, time.Now().UTC().Format("200601021504"))

		count, err := rdb.Incr(ctx, key).Result()
		if err == nil {
			rdb.Expire(ctx, key, 70*time.Second)
		}

		remaining := limit - int(count)
		if remaining < 0 {
			remaining = 0
		}

		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(nextMinuteUnix(), 10))

		if int(count) > limit {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded",
				"limit":       limit,
				"retry_after": 60,
			})
			return
		}

		c.Next()
	}
}

// RateLimit is the simple per-endpoint/IP middleware from the original implementation (kept for backward compat).
// For tiered limits use RateLimitMiddleware.
func RateLimit(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		endpoint := c.FullPath()
		if endpoint == "" {
			endpoint = "unknown"
		}

		// High-frequency map reads are refreshed elsewhere and should not trip
		// the generic API limiter during normal location tracking.
		if endpoint == "/api/v1/location/nearby" || endpoint == "/api/v1/heatmap/statistics" {
			c.Next()
			return
		}

		key := fmt.Sprintf("ratelimit:%s:%s", endpoint, ip)
		ctx := context.Background()

		current, err := rdb.Get(ctx, key).Int()
		if err != nil && err != redis.Nil {
			c.Next()
			return
		}

		if current >= limit {
			c.Writer.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
			c.Writer.Header().Set("X-RateLimit-Remaining", "0")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests, please slow down",
				"code":  "RATE_LIMIT_EXCEEDED",
			})
			return
		}

		pipe := rdb.TxPipeline()
		pipe.Incr(ctx, key)
		if current == 0 {
			pipe.Expire(ctx, key, window)
		}
		pipe.Exec(ctx) //nolint:errcheck

		c.Writer.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Writer.Header().Set("X-RateLimit-Remaining", strconv.Itoa(limit-(current+1)))
		c.Next()
	}
}

// checkAnonymousLimit allows up to anonLimit (30) requests per minute per IP.
// Returns true if the request is allowed.
func checkAnonymousLimit(c *gin.Context, rdb *redis.Client) bool {
	ctx := context.Background()
	ip := c.ClientIP()
	key := fmt.Sprintf("rate_limit:anon:%s:%s", ip, time.Now().UTC().Format("200601021504"))

	count, _ := rdb.Incr(ctx, key).Result()
	rdb.Expire(ctx, key, 70*time.Second)

	remaining := anonLimit - int(count)
	if remaining < 0 {
		remaining = 0
	}
	c.Header("X-RateLimit-Limit", strconv.Itoa(anonLimit))
	c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
	c.Header("X-RateLimit-Reset", strconv.FormatInt(nextMinuteUnix(), 10))

	if int(count) > anonLimit {
		c.Header("Retry-After", "60")
		c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
			"error":       "Rate limit exceeded for unauthenticated requests",
			"limit":       anonLimit,
			"retry_after": 60,
		})
		return false
	}
	return true
}

func nextMinuteUnix() int64 {
	now := time.Now().UTC()
	return now.Truncate(time.Minute).Add(time.Minute).Unix()
}
