package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/fcm"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found, using system environment")
	}

	serverKey := os.Getenv("FCM_SERVER_KEY")
	if serverKey == "" || serverKey == "your_fcm_server_key" || serverKey == "your_actual_fcm_server_key_here" {
		log.Fatal("❌ FCM_SERVER_KEY not configured in .env file")
	}

	// Test token (replace with actual Expo push token from your device)
	testToken := os.Args[1]
	if testToken == "" {
		log.Fatal("Usage: go run test_notification.go <expo_push_token>")
	}

	fmt.Println("🔔 Testing FCM Notification...")
	fmt.Printf("Token: %s\n", testToken)

	client := fcm.NewClient(serverKey)

	// Send test notification
	msgID, err := client.SendNotification(
		testToken,
		"🚨 Test Emergency Alert",
		"This is a test notification from SafeAround backend",
		map[string]string{
			"category":   "EMERGENCY_ALERT",
			"alert_type": "test",
			"test":       "true",
		},
	)

	if err != nil {
		log.Fatalf("❌ Notification failed: %v", err)
	}

	fmt.Printf("✅ Notification sent successfully!\n")
	fmt.Printf("Message ID: %s\n", msgID)
}
