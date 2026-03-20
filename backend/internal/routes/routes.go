package routes

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/handlers"
	"github.com/obsidiannnn/Safe-Around/backend/internal/middleware"
	"github.com/redis/go-redis/v9"
)

func SetupRouter(
	authHandler *handlers.AuthHandler,
	healthHandler *handlers.HealthHandler,
	notifHandler *handlers.NotificationHandler,
	alertHandler *handlers.AlertHandler,
	rdb *redis.Client,
) *gin.Engine {
	r := gin.New()

	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CorsMiddleware())

	// Public Health endpoints
	healthGroup := r.Group("/health")
	{
		healthGroup.GET("", healthHandler.GetHealth)
		healthGroup.GET("/ping", healthHandler.GetPing)
		healthGroup.GET("/readiness", healthHandler.GetReadiness)
	}

	// API Endpoints - applying global rate limit of 100 requests / minute initially
	api := r.Group("/api/v1")
	api.Use(middleware.RateLimit(rdb, 100, 60*time.Second))
	{
		SetupAuthRoutes(api, authHandler)

		// Notifications domain
		notifs := api.Group("/notifications")
		notifs.Use(middleware.AuthRequired())
		{
			// Example of stricter rate limit on push triggers (10 / min)
			notifs.POST("", middleware.RateLimit(rdb, 10, 60*time.Second), notifHandler.SendPushNotification)
			
			// Standard history fetches
			notifs.GET("/history", notifHandler.GetNotificationHistory)
			notifs.PUT("/:id/read", notifHandler.UpdateNotificationStatus)
		}

		// Emergency Alerts domain
		alerts := api.Group("/alerts")
		alerts.Use(middleware.AuthRequired())
		{
			alerts.POST("", alertHandler.CreateAlert)
			alerts.GET("/:id", alertHandler.GetAlertDetails)
			alerts.POST("/:id/respond", alertHandler.RespondToAlert)
			alerts.PATCH("/:id/status", alertHandler.UpdateAlertStatus)
			alerts.POST("/:id/escalate", alertHandler.EscalateAlert)
			alerts.GET("/active", alertHandler.GetActiveAlerts)
			alerts.GET("/history", alertHandler.GetAlertHistory)
		}
	}

	return r
}
