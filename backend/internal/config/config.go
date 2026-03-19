package config

import (
	"errors"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Server struct {
		Host string
		Port string
		Env  string
	}
	DB struct {
		Host     string
		Port     string
		User     string
		Password string
		Name     string
		SSLMode  string
	}
	Redis struct {
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

	// Redis
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
	if cfg.Redis.Host == "" {
		return errors.New("missing redis config")
	}
	if cfg.JWT.Secret == "" {
		return errors.New("missing jwt secret")
	}
	return nil
}
