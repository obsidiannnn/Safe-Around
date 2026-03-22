package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HeatmapHandler struct {
	db    *gorm.DB
	redis *redis.Client
}

func NewHeatmapHandler(db *gorm.DB, redis *redis.Client) *HeatmapHandler {
	return &HeatmapHandler{
		db:    db,
		redis: redis,
	}
}

// GET /api/v1/heatmap/data
// Returns crime data points for frontend heatmap
func (h *HeatmapHandler) GetHeatmapData(c *gin.Context) {
	// Parse bounds from query params
	north := c.Query("north")
	south := c.Query("south")
	east := c.Query("east")
	west := c.Query("west")

	// Query crimes in visible map bounds, evaluating dynamic time-decay factor for weight_pct
	query := `
        SELECT
            id,
            crime_type,
            severity,
            ST_Y(location::geometry) as latitude,
            ST_X(location::geometry) as longitude,
            occurred_at,
            GREATEST(0.0, 
                CASE severity 
                    WHEN 4 THEN 100.0 
                    WHEN 3 THEN 75.0 
                    WHEN 2 THEN 50.0 
                    ELSE 25.0 
                END 
                - 
                (EXTRACT(EPOCH FROM (NOW() - occurred_at)) / 86400.0 * 
                CASE 
                    WHEN crime_type IN ('murder', 'rape') THEN 0.1 
                    WHEN crime_type IN ('robbery', 'kidnapping', 'assault') THEN 0.5 
                    ELSE 2.0 
                END)
            ) as weight_pct
        FROM crime_incidents
        WHERE ST_Within(
            location::geometry,
            ST_MakeEnvelope(?, ?, ?, ?, 4326)
        )
        AND occurred_at > NOW() - INTERVAL '30 days'
        LIMIT 10000
    `

	var crimes []map[string]interface{}
	h.db.Raw(query, west, south, east, north).Scan(&crimes)

	c.JSON(200, gin.H{
		"success": true,
		"data":    crimes,
		"count":   len(crimes),
	})
}

// GET /api/v1/heatmap/grid
// Returns aggregated grid data for smooth heatmap
func (h *HeatmapHandler) GetGridData(c *gin.Context) {
	north := c.Query("north")
	south := c.Query("south")
	east := c.Query("east")
	west := c.Query("west")

	// Get grid cells in bounds
	query := `
        SELECT
            grid_x,
            grid_y,
            crime_count,
            severity_sum,
            avg_severity
        FROM mv_crime_heatmap_grid
        WHERE grid_x BETWEEN FLOOR(? / 0.001) AND FLOOR(? / 0.001)
        AND grid_y BETWEEN FLOOR(? / 0.001) AND FLOOR(? / 0.001)
    `

	var gridCells []map[string]interface{}
	h.db.Raw(query, west, south, east, north).Scan(&gridCells)

	c.JSON(200, gin.H{
		"success": true,
		"data":    gridCells,
	})
}

// GET /api/v1/heatmap/tiles/:z/:x/:y
func (h *HeatmapHandler) GetTile(c *gin.Context) {
	// For backward compatibility, return an empty image or 404
	c.Status(http.StatusNotFound)
}

// GET /api/v1/heatmap/zone
func (h *HeatmapHandler) GetZoneInfo(c *gin.Context) {
	lat := c.Query("lat")
	lng := c.Query("lng")

	var stats struct {
		CrimeCount   int     `json:"crime_count"`
		SafetyRating float64 `json:"safety_rating"`
	}

	h.db.Raw(`
        SELECT COUNT(*) as crime_count 
        FROM crime_incidents 
        WHERE ST_DWithin(location, ST_MakePoint(?, ?)::geography, 1000)
    `, lng, lat).Scan(&stats)

	stats.SafetyRating = 5.0 - (float64(stats.CrimeCount) * 0.5)
	if stats.SafetyRating < 0 {
		stats.SafetyRating = 0
	}

	c.JSON(200, gin.H{"success": true, "data": stats})
}

// GET /api/v1/heatmap/crimes
func (h *HeatmapHandler) GetRecentCrimes(c *gin.Context) {
	var crimes []map[string]interface{}
	h.db.Raw(`SELECT * FROM crime_incidents ORDER BY occurred_at DESC LIMIT 50`).Scan(&crimes)
	c.JSON(200, gin.H{"success": true, "data": crimes})
}

// GET /api/v1/heatmap/statistics
func (h *HeatmapHandler) GetStatistics(c *gin.Context) {
	lat := c.Query("lat")
	lng := c.Query("lng")

	// Get total crimes in a 1km radius for the area score
	var crimeCount int64
	h.db.Model(&models.CrimeIncident{}).
		Where("ST_DWithin(location, ST_MakePoint(?, ?)::geography, 1000)", lng, lat).
		Count(&crimeCount)

	// Calculate a safety score 0-100
	safetyScore := 100 - (crimeCount * 5)
	if safetyScore < 0 {
		safetyScore = 0
	}

	// For testing purposes, we'll return some mock/calculated values
	// that match the frontend AreaStats interface
	stats := gin.H{
		"safetyScore":  safetyScore,
		"nearbyUsers":  12, // Mock for now
		"recentAlerts": crimeCount,
		"crimeRate":    float64(crimeCount) * 0.1,
		"lastUpdated":  time.Now(),
	}

	c.JSON(200, stats)
}

// POST /api/v1/heatmap/report
func (h *HeatmapHandler) ReportIncident(c *gin.Context) {
	var input struct {
		CrimeType   string  `json:"crime_type" binding:"required"`
		Severity    int     `json:"severity" binding:"required"`
		Latitude    float64 `json:"latitude" binding:"required"`
		Longitude   float64 `json:"longitude" binding:"required"`
		Description string  `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
        INSERT INTO crime_incidents (crime_type, severity, location, description, occurred_at)
        VALUES (?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?, NOW())
    `
	if err := h.db.Exec(query, input.CrimeType, input.Severity, input.Longitude, input.Latitude, input.Description).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"success": true, "message": "Incident reported successfully"})
}
