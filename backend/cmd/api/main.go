package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/config"
	"github.com/obsidiannnn/Safe-Around/backend/internal/database"
	"github.com/obsidiannnn/Safe-Around/backend/internal/handlers"
	"github.com/obsidiannnn/Safe-Around/backend/internal/repository"
	"github.com/obsidiannnn/Safe-Around/backend/internal/routes"
	"github.com/obsidiannnn/Safe-Around/backend/internal/services"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/fcm"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/logger"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/twilio"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	// Initialize Custom Structured Logger
	logger.InitLogger(cfg.Server.Env, cfg.Server.Env == "development")

	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 1. Database Connection
	db, err := database.NewPostgresDB(cfg)
	if err != nil {
		logger.Fatal("failed to connect database", zap.Error(err))
	}
	
	// Auto Migrate existing models
	if err := database.RunMigrations(db); err != nil {
		logger.Fatal("failed to migrate database", zap.Error(err))
	}
	logger.Info("database connected and migrated")

	// 2. Redis Connection
	rdb, err := database.NewRedisClient(cfg)
	if err != nil {
		logger.Fatal("failed to connect redis", zap.Error(err))
	}
	logger.Info("redis connected")

	// 3. External Integrations
	fcmClient := fcm.NewClient(os.Getenv("FCM_SERVER_KEY"))
	twilioClient := twilio.NewClient(os.Getenv("TWILIO_ACCOUNT_SID"), os.Getenv("TWILIO_AUTH_TOKEN"))

	// 4. Setup Repositories & Services
	userRepo := repository.NewUserRepo(db)
	notifSvc := services.NewNotificationService(fcmClient, twilioClient, db, rdb)

	// 5. Setup Handlers
	authHandler := handlers.NewAuthHandler(userRepo, rdb, twilioClient)
	healthHandler := handlers.NewHealthHandler(db, rdb, cfg)
	notifHandler := handlers.NewNotificationHandler(notifSvc)

	// 6. Setup Routes
	r := routes.SetupRouter(authHandler, healthHandler, notifHandler, rdb)

	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: r,
	}

	go func() {
		log.Printf("server starting on port %s", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen error: %s\n", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("server forced to shutdown:", err)
	}

	log.Println("server exited properly")
}