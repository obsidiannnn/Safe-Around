package database

import (
	"context"
	"fmt"
	"strconv"

	"github.com/obsidiannnn/Safe-Around/backend/internal/config"
	"github.com/redis/go-redis/v9"
)

// NewRedisClient initializes and returns a Redis client.
// Supports both local Redis (Host/Port) and cloud Redis (URL like Upstash).
func NewRedisClient(cfg *config.Config) (*redis.Client, error) {
	var rdb *redis.Client

	// If REDIS_URL is set, use it directly (Upstash / cloud Redis)
	if cfg.Redis.URL != "" {
		opt, err := redis.ParseURL(cfg.Redis.URL)
		if err != nil {
			return nil, fmt.Errorf("invalid REDIS_URL: %w", err)
		}
		rdb = redis.NewClient(opt)
	} else {
		// Fallback to local Redis via Host + Port
		dbInt := 0
		if cfg.Redis.DB != "" {
			dbInt, _ = strconv.Atoi(cfg.Redis.DB)
		}
		rdb = redis.NewClient(&redis.Options{
			Addr:     fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
			Password: cfg.Redis.Password,
			DB:       dbInt,
		})
	}

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	return rdb, nil
}
