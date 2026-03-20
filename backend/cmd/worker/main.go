package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/obsidiannnn/Safe-Around/backend/internal/config"
	"github.com/obsidiannnn/Safe-Around/backend/internal/database"
	"github.com/redis/go-redis/v9"
	"github.com/robfig/cron/v3"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func main() {
	// ---------- Bootstrap ----------
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	db, err := database.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("db connect error: %v", err)
	}

	rdb, err := database.NewRedisClient(cfg)
	if err != nil {
		log.Fatalf("redis connect error: %v", err)
	}

	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
	log.Println("✅ Worker connected to DB and Redis")

	// ---------- Scheduler ----------
	jobs := NewJobRunner(db, rdb)
	c := cron.New(cron.WithSeconds()) // use standard 5-field or 6-field (WithSeconds)

	schedule := []struct {
		spec string
		name string
		fn   func()
	}{
		{"0 * * * *", "RefreshHeatmapView", jobs.RefreshHeatmapView},
		{"5 * * * *", "UpdateDangerZones", jobs.UpdateDangerZones},
		{"0 2 * * *", "CleanOldLocations", jobs.CleanOldLocations},
		{"0 3 * * 0", "CleanOldNotifications", jobs.CleanOldNotifications},
		{"0 4 * * *", "GenerateDailyReport", jobs.GenerateDailyReport},
		{"0 1 * * *", "PrewarmTileCache", jobs.PrewarmTileCache},
		{"0 9 * * *", "SendDailySafetyDigest", jobs.SendDailySafetyDigest},
		{"0 */6 * * *", "ExpireInactiveSessions", jobs.ExpireInactiveSessions},
		{"0 0 * * *", "UpdateTrustScores", jobs.UpdateTrustScores},
		{"0 3 1 * *", "ArchiveOldAlerts", jobs.ArchiveOldAlerts},
	}

	for _, s := range schedule {
		s := s // capture
		c.AddFunc(s.spec, func() { //nolint:errcheck
			jobs.run(s.name, s.fn)
		})
		log.Printf("📅 Registered job %-30s  cron: %s", s.name, s.spec)
	}

	c.Start()
	log.Println("🚀 SafeAround background worker started")

	// ---------- Graceful shutdown ----------
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	<-sigCh

	log.Println("⏳ Shutdown signal received, draining jobs...")
	stopCtx := c.Stop()

	select {
	case <-stopCtx.Done():
		log.Println("✅ All jobs finished. Worker stopped.")
	case <-time.After(30 * time.Second):
		log.Println("⚠️  Timeout waiting for jobs – forcing exit.")
	}
}

// JobRunner holds shared dependencies for all cron jobs.
type JobRunner struct {
	db    *gorm.DB
	redis *redis.Client
	log   *zap.SugaredLogger
}

func NewJobRunner(db *gorm.DB, rdb *redis.Client) *JobRunner {
	logger, _ := zap.NewProduction()
	return &JobRunner{db: db, redis: rdb, log: logger.Sugar()}
}

// run wraps a job function with timing, error recovery, and structured logging.
func (j *JobRunner) run(name string, fn func()) {
	start := time.Now()
	j.log.Infow("Job started", "job", name)

	defer func() {
		if r := recover(); r != nil {
			j.log.Errorw("Job panicked", "job", name, "panic", r)
		}
		elapsed := time.Since(start)
		j.log.Infow("Job finished", "job", name, "duration_ms", elapsed.Milliseconds())
	}()

	fn()
}
