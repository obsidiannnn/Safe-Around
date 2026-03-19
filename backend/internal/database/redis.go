package database

import (
	"context"
	"fmt"
	"strconv"

	"github.com/obsidiannnn/Safe-Around/backend/internal/config"
	"github.com/redis/go-redis/v9"
)

// NewRedisClient initializes and returns a Redis client
func NewRedisClient(cfg *config.Config) (*redis.Client, error) {
	dbInt := 0
	if cfg.Redis.DB != "" {
		dbInt, _ = strconv.Atoi(cfg.Redis.DB)
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
		Password: cfg.Redis.Password,
		DB:       dbInt,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}

	return rdb, nil
}
