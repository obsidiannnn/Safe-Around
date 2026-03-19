package database

import (
	"fmt"
	"net/url"

	"github.com/obsidiannnn/Safe-Around/backend/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// NewPostgresDB initializes and returns a Postgres GORM connection
func NewPostgresDB(cfg *config.Config) (*gorm.DB, error) {
	// Use URL format so the full pooler username (e.g. postgres.xyz) is preserved
	// and special characters in the password are properly encoded
	dsn := fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=%s&TimeZone=UTC",
		cfg.DB.User,
		url.QueryEscape(cfg.DB.Password),
		cfg.DB.Host,
		cfg.DB.Port,
		cfg.DB.Name,
		cfg.DB.SSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	return db, nil
}
