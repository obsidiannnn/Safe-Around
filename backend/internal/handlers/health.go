package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/config"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db    *gorm.DB
	redis *redis.Client
	cfg   *config.Config
}

func NewHealthHandler(db *gorm.DB, rdb *redis.Client, cfg *config.Config) *HealthHandler {
	return &HealthHandler{
		db:    db,
		redis: rdb,
		cfg:   cfg,
	}
}

// GetHealth returns basic app health info
func (h *HealthHandler) GetHealth(c *gin.Context) {
	data := gin.H{
		"status":      "healthy",
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"version":     "1.0.0",
		"environment": h.cfg.Server.Env,
	}
	c.JSON(http.StatusOK, SuccessResponse(data))
}

// GetPing returns a simple pong
func (h *HealthHandler) GetPing(c *gin.Context) {
	c.JSON(http.StatusOK, SuccessResponse(gin.H{"message": "pong"}))
}

// GetReadiness validates DB and Redis are actively responding
func (h *HealthHandler) GetReadiness(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	status := http.StatusOK
	services := gin.H{
		"database": "up",
		"redis":    "up",
	}

	// Ping Database
	sqlDB, err := h.db.DB()
	if err != nil || sqlDB.PingContext(ctx) != nil {
		services["database"] = "down"
		status = http.StatusServiceUnavailable
	}

	// Ping Redis
	if err := h.redis.Ping(ctx).Err(); err != nil {
		services["redis"] = "down"
		status = http.StatusServiceUnavailable
	}

	if status == http.StatusOK {
		c.JSON(status, SuccessResponse(gin.H{"services": services}))
		return
	}

	c.JSON(status, ErrorResponse("SERVICE_UNAVAILABLE", "One or more dependent services are down"))
}
