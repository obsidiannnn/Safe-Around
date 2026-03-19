package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/logger"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/twilio"
)

func main() {
	// Load environment variables from .env file
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Note: Error loading .env file, relying on system environment variables")
	}

	logger.InitLogger("info", true)

	sid := os.Getenv("TWILIO_ACCOUNT_SID")
	token := os.Getenv("TWILIO_AUTH_TOKEN")
	toPhone := "+919119759509" // UPDATE THIS: Enter your destination phone number (with country code, e.g., +15551234567)

	if sid == "" || sid == "your_twilio_sid" {
		fmt.Println("Error: Please set your actual Twilio SID and Token in the .env file")
		os.Exit(1)
	}

	if toPhone == "" {
		fmt.Println("Error: Please specify the destination phone number in the script (Line 19)")
		os.Exit(1)
	}

	fmt.Println("Initializing Twilio Client...")
	client := twilio.NewClient(sid, token)

	fmt.Printf("Sending SMS to %s...\n", toPhone)
	
	verifySID := "VAec453b0a41cbb20d1577c8c7ffe8ce64"

	msgID, err := client.SendOTP(toPhone, verifySID)
	
	if err != nil {
		fmt.Printf("Error: Failed to deliver message. Reason: %v\n", err)
		os.Exit(1)
	}
	
	fmt.Printf("Success! OTP Message delivered. Verify Token Hook ID: %s\n", msgID)
}
