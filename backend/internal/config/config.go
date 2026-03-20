package config

import (
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Server struct {
		Host string
		Port string
		Env  string
	}
	DB struct {
		Host            string
		Port            string
		User            string
		Password        string
		Name            string
		SSLMode         string
		MaxOpenConns    int
		MaxIdleConns    int
		ConnMaxLifetime time.Duration
	}
	Redis struct {
		URL      string // Cloud Redis URL (e.g. Upstash) - takes priority
		Host     string
		Port     string
		Password string
		DB       string
	}
	JWT struct {
		Secret string
		Expiry string
	}
}

func LoadConfig() (*Config, error) {
	_ = godotenv.Load() // ignore error, might be running in prod w/o .env

	cfg := &Config{}

	// Server
	cfg.Server.Host = os.Getenv("SERVER_HOST")
	cfg.Server.Port = os.Getenv("SERVER_PORT")
	if cfg.Server.Port == "" {
		cfg.Server.Port = "8000"
	}
	cfg.Server.Env = os.Getenv("ENV")
	if cfg.Server.Env == "" {
		cfg.Server.Env = "development"
	}

	// DB
	cfg.DB.Host = os.Getenv("DB_HOST")
	cfg.DB.Port = os.Getenv("DB_PORT")
	cfg.DB.User = os.Getenv("DB_USER")
	cfg.DB.Password = os.Getenv("DB_PASSWORD")
	cfg.DB.Name = os.Getenv("DB_NAME")
	cfg.DB.SSLMode = os.Getenv("DB_SSLMODE")
	if cfg.DB.SSLMode == "" {
		cfg.DB.SSLMode = "disable"
	}
	cfg.DB.MaxOpenConns = envInt("DB_MAX_OPEN_CONNS", 25)
	cfg.DB.MaxIdleConns = envInt("DB_MAX_IDLE_CONNS", 5)
	cfg.DB.ConnMaxLifetime = envDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute)

	// Redis - supports cloud URL (Upstash) or local Host:Port
	cfg.Redis.URL = os.Getenv("REDIS_URL")
	cfg.Redis.Host = os.Getenv("REDIS_HOST")
	cfg.Redis.Port = os.Getenv("REDIS_PORT")
	cfg.Redis.Password = os.Getenv("REDIS_PASSWORD")
	cfg.Redis.DB = os.Getenv("REDIS_DB")
	if cfg.Redis.DB == "" {
		cfg.Redis.DB = "0"
	}

	// JWT
	cfg.JWT.Secret = os.Getenv("JWT_SECRET")
	cfg.JWT.Expiry = os.Getenv("JWT_EXPIRY")

	if err := validate(cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}

func validate(cfg *Config) error {
	// Let test env bypass strict checks to allow unit tests
	if cfg.Server.Env == "testing" {
		return nil
	}
	if cfg.DB.Host == "" || cfg.DB.User == "" || cfg.DB.Password == "" || cfg.DB.Name == "" {
		return errors.New("missing db config")
	}
	if cfg.Redis.URL == "" && cfg.Redis.Host == "" {
		return errors.New("missing redis config: set REDIS_URL or REDIS_HOST")
	}
	if cfg.JWT.Secret == "" {
		return errors.New("missing jwt secret")
	}
	return nil
}

// envInt reads an integer environment variable, returning defaultVal if unset or unparseable.
func envInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultVal
}

// envDuration reads a time.Duration environment variable (e.g. "5m", "1h"),
// returning defaultVal if unset or unparseable.
func envDuration(key string, defaultVal time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return defaultVal
}
