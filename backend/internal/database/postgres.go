package database

import (
	"fmt"
	"log"
	"math"
	"net/url"
	"time"

	"github.com/obsidiannnn/Safe-Around/backend/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// maxRetries is the number of connection attempts before giving up.
const maxRetries = 5

// NewPostgresDB initializes and returns a Postgres GORM connection.
// It retries up to 5 times with exponential backoff (1s, 2s, 4s, 8s, 16s).
func NewPostgresDB(cfg *config.Config) (*gorm.DB, error) {
	// Use URL format so special characters in password are correctly encoded
	// and Supabase connection-pooler usernames (e.g. postgres.xyz) are preserved.
	dsn := fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=%s&TimeZone=UTC",
		cfg.DB.User,
		url.QueryEscape(cfg.DB.Password),
		cfg.DB.Host,
		cfg.DB.Port,
		cfg.DB.Name,
		cfg.DB.SSLMode,
	)

	gormCfg := &gorm.Config{
		Logger:                 logger.Default.LogMode(logger.Warn),
		PrepareStmt:            true,
		SkipDefaultTransaction: true,
	}

	var db *gorm.DB
	var err error

	for attempt := 0; attempt < maxRetries; attempt++ {
		db, err = gorm.Open(postgres.Open(dsn), gormCfg)
		if err == nil {
			sqlDB, sqlErr := db.DB()
			if sqlErr == nil {
				if pingErr := sqlDB.Ping(); pingErr == nil {
					// Apply connection pool settings
					sqlDB.SetMaxOpenConns(cfg.DB.MaxOpenConns)
					sqlDB.SetMaxIdleConns(cfg.DB.MaxIdleConns)
					sqlDB.SetConnMaxLifetime(cfg.DB.ConnMaxLifetime)

					log.Printf("✅ Database connected successfully (attempt %d/%d)", attempt+1, maxRetries)
					return db, nil
				}
			}
		}

		backoff := time.Duration(math.Pow(2, float64(attempt))) * time.Second
		log.Printf("⚠️  Database connection attempt %d/%d failed, retrying in %v... err: %v",
			attempt+1, maxRetries, backoff, err)
		time.Sleep(backoff)
	}

	return nil, fmt.Errorf("failed to connect to database after %d attempts: %w", maxRetries, err)
}
