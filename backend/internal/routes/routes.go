package routes

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/handlers"
	"github.com/obsidiannnn/Safe-Around/backend/internal/middleware"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

func SetupRouter(
	authHandler *handlers.AuthHandler,
	healthHandler *handlers.HealthHandler,
	notifHandler *handlers.NotificationHandler,
	alertHandler *handlers.AlertHandler,
	heatmapHandler *handlers.HeatmapHandler,
	wsHandler gin.HandlerFunc,
	locationHandler *handlers.LocationHandler,
	routeHandler *handlers.RouteHandler,
	profileHandler *handlers.ProfileHandler,
	geofencingHandler *handlers.GeofencingHandler,
	rdb *redis.Client,
) *gin.Engine {
	r := gin.New()

	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.SecurityHeadersMiddleware())
	r.Use(middleware.CorsMiddleware())
	r.Use(middleware.MetricsMiddleware())

	// Prometheus metrics scrape endpoint (unauthenticated – secure at the network level)
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))
	// Public Health endpoints
	healthGroup := r.Group("/health")
	{
		healthGroup.GET("", healthHandler.GetHealth)
		healthGroup.GET("/ping", healthHandler.GetPing)
		healthGroup.GET("/readiness", healthHandler.GetReadiness)
	}

	// WebSockets Upgrade Endpoint
	r.GET("/ws/crime", wsHandler)

	// API Endpoints - applying global rate limit of 100 requests / minute initially
	api := r.Group("/api/v1")
	api.Use(middleware.RateLimit(rdb, 100, 60*time.Second))
	{
		SetupAuthRoutes(api, authHandler)

		// Notifications domain
		notifs := api.Group("/notifications")
		notifs.Use(middleware.AuthRequired())
		{
			notifs.POST("/register-token", notifHandler.RegisterDeviceToken)
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

		// Heatmap domain
		heatmap := api.Group("/heatmap")
		{
			heatmap.GET("/data", heatmapHandler.GetHeatmapData)
			heatmap.GET("/grid", heatmapHandler.GetGridData)
			heatmap.GET("/tiles/:z/:x/:y", heatmapHandler.GetTile) // Keep for backward compatibility
			heatmap.GET("/zone", heatmapHandler.GetZoneInfo)
			heatmap.GET("/crimes", heatmapHandler.GetRecentCrimes)
			heatmap.GET("/statistics", heatmapHandler.GetStatistics)
			heatmap.POST("/report", middleware.AuthRequired(), heatmapHandler.ReportIncident)
		}

		// Location domain
		location := api.Group("/location")
		location.Use(middleware.AuthRequired())
		{
			location.POST("", locationHandler.UpdateLocation)
			location.GET("/me", locationHandler.GetCurrentLocation)
			location.GET("/nearby", locationHandler.GetNearbyUsers)
		}

		// Safe Route Planning
		routesGroup := api.Group("/routes")
		routesGroup.Use(middleware.AuthRequired())
		{
			routesGroup.POST("/safe", routeHandler.GetSafeRoutes)
		}

		// User Profile & Contacts domain
		users := api.Group("/users")
		users.Use(middleware.AuthRequired())
		{
			users.GET("/profile", profileHandler.GetProfile)
			users.PUT("/profile", profileHandler.UpdateProfile)
			users.GET("/contacts", profileHandler.GetContacts)
			users.POST("/contacts", profileHandler.AddContact)
			users.DELETE("/contacts/:id", profileHandler.DeleteContact)
		}

		// Geofencing domain
		geofencing := api.Group("/geofencing")
		geofencing.Use(middleware.AuthRequired())
		{
			geofencing.GET("/check", geofencingHandler.CheckDangerZone)
			geofencing.GET("/nearby-users", geofencingHandler.GetNearbyUsers)
			geofencing.POST("/location", geofencingHandler.UpdateLocation)
			geofencing.GET("/zones", geofencingHandler.GetDangerZones)
		}
	}

	return r
}
