package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/config"
	"github.com/obsidiannnn/Safe-Around/backend/internal/handlers"
	"github.com/stretchr/testify/assert"
)

func setupHealthRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// Use empty values for DB and Redis since health/ping don't need active conn objects
	// (except for readiness which we mock conceptually below or skip depending on db presence)
	cfg := &config.Config{}
	cfg.Server.Env = "testing"

	h := handlers.NewHealthHandler(nil, nil, cfg)
	
	healthGroup := r.Group("/health")
	{
		healthGroup.GET("", h.GetHealth)
		healthGroup.GET("/ping", h.GetPing)
		// We purposefully skip testing generic Readiness over nil pointers here
		// since that requires a live DB or heavy mocking interfaces for sql.DB inside GORM.
	}

	return r
}

func TestHealthEndpoint(t *testing.T) {
	router := setupHealthRouter()

	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.True(t, response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Equal(t, "healthy", data["status"])
	assert.Equal(t, "1.0.0", data["version"])
	assert.Equal(t, "testing", data["environment"])
	
	// Ensure timestamp exists and is parsable
	_, err = time.Parse(time.RFC3339, data["timestamp"].(string))
	assert.NoError(t, err)
}

func TestPingEndpoint(t *testing.T) {
	router := setupHealthRouter()

	req, _ := http.NewRequest("GET", "/health/ping", nil)
	w := httptest.NewRecorder()
	
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.True(t, response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Equal(t, "pong", data["message"])
}
