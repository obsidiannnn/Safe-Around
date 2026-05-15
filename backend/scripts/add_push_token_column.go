package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load .env file
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Build connection string
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=require",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)

	// Connect to database
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Add push_token column
	log.Println("Adding push_token column to users table...")
	if err := db.Exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token VARCHAR(255)").Error; err != nil {
		log.Fatalf("Failed to add push_token column: %v", err)
	}

	// Create index
	log.Println("Creating index on push_token...")
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token)").Error; err != nil {
		log.Fatalf("Failed to create index: %v", err)
	}

	log.Println("✅ Successfully added push_token column and index!")
}
