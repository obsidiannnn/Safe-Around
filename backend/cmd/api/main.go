package main

import (
	"log"
	"net/http"
)

func main() {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Println("SafeAround API running on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}