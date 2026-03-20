package handlers

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"gorm.io/gorm"
)

type HeatmapHandler struct {
	db *gorm.DB
}

func NewHeatmapHandler(db *gorm.DB) *HeatmapHandler {
	return &HeatmapHandler{db: db}
}

// GET /api/v1/heatmap/zone?lat=&lng=
func (h *HeatmapHandler) GetZoneInfo(c *gin.Context) {
	latStr := c.Query("lat")
	lngStr := c.Query("lng")

	lat, err1 := strconv.ParseFloat(latStr, 64)
	lng, err2 := strconv.ParseFloat(lngStr, 64)
	if err1 != nil || err2 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid lat/lng parameters"})
		return
	}

	const radiusMeters = 500.0
	const metersPerDegree = 111320.0

	latDelta := radiusMeters / metersPerDegree
	lngDelta := radiusMeters / (metersPerDegree * math.Cos(lat*math.Pi/180))

	// Count crimes and calculate safety score
	type Result struct {
		Count     int     `gorm:"column:count"`
		AvgSev    float64 `gorm:"column:avg_sev"`
		TopType   string  `gorm:"column:top_type"`
	}
	var result Result
	h.db.Raw(`
		SELECT 
			COUNT(*) as count,
			COALESCE(AVG(severity), 0) as avg_sev,
			COALESCE(MODE() WITHIN GROUP (ORDER BY type), 'none') as top_type
		FROM crime_incidents
		WHERE
			latitude BETWEEN ? AND ?
			AND longitude BETWEEN ? AND ?
			AND occurred_at > NOW() - INTERVAL '30 days'
			AND verified = true
	`, lat-latDelta, lat+latDelta, lng-lngDelta, lng+lngDelta).Scan(&result)

	// Safety score: 100 = no incidents, decreases with count and severity
	safetyScore := 100.0 - math.Min(float64(result.Count)*result.AvgSev*2.5, 100.0)
	if safetyScore < 0 {
		safetyScore = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"location":              gin.H{"latitude": lat, "longitude": lng},
		"radius":                radiusMeters,
		"safety_score":          math.Round(safetyScore*10) / 10,
		"crime_count":           result.Count,
		"most_common_crime_type": result.TopType,
	})
}

// GET /api/v1/heatmap/crimes?lat=&lng=&radius=
func (h *HeatmapHandler) GetRecentCrimes(c *gin.Context) {
	latStr := c.Query("lat")
	lngStr := c.Query("lng")
	radiusStr := c.DefaultQuery("radius", "1000")

	lat, err1 := strconv.ParseFloat(latStr, 64)
	lng, err2 := strconv.ParseFloat(lngStr, 64)
	radius, err3 := strconv.ParseFloat(radiusStr, 64)
	if err1 != nil || err2 != nil || err3 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameters"})
		return
	}

	const metersPerDegree = 111320.0
	latDelta := radius / metersPerDegree
	lngDelta := radius / (metersPerDegree * math.Cos(lat*math.Pi/180))

	var crimes []models.CrimeIncident
	h.db.Where(`
		latitude BETWEEN ? AND ?
		AND longitude BETWEEN ? AND ?
		AND occurred_at > NOW() - INTERVAL '30 days'
		AND verified = true
	`, lat-latDelta, lat+latDelta, lng-lngDelta, lng+lngDelta).
		Order("occurred_at DESC").
		Limit(50).
		Find(&crimes)

	c.JSON(http.StatusOK, gin.H{
		"crimes": crimes,
		"count":  len(crimes),
	})
}

// GET /api/v1/heatmap/statistics?lat=&lng=&radius=
func (h *HeatmapHandler) GetStatistics(c *gin.Context) {
	latStr := c.Query("lat")
	lngStr := c.Query("lng")
	radiusStr := c.DefaultQuery("radius", "500")

	lat, err1 := strconv.ParseFloat(latStr, 64)
	lng, err2 := strconv.ParseFloat(lngStr, 64)
	radius, err3 := strconv.ParseFloat(radiusStr, 64)
	if err1 != nil || err2 != nil || err3 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameters"})
		return
	}

	const metersPerDegree = 111320.0
	latDelta := radius / metersPerDegree
	lngDelta := radius / (metersPerDegree * math.Cos(lat*math.Pi/180))

	// Crime data
	type CrimeStat struct {
		Count  int     `gorm:"column:count"`
		AvgSev float64 `gorm:"column:avg_sev"`
	}
	var crimeStat CrimeStat
	h.db.Raw(`
		SELECT COUNT(*) as count, COALESCE(AVG(severity),0) as avg_sev
		FROM crime_incidents
		WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
		AND occurred_at > NOW() - INTERVAL '30 days' AND verified = true
	`, lat-latDelta, lat+latDelta, lng-lngDelta, lng+lngDelta).Scan(&crimeStat)

	// Recent alerts (last 24h)
	var recentAlerts int64
	h.db.Table("emergency_alerts").
		Where("created_at > NOW() - INTERVAL '24 hours'").
		Count(&recentAlerts)

	// Nearby active users
	var nearbyUsers int64
	h.db.Table("user_locations").
		Where(`
			latitude BETWEEN ? AND ?
			AND longitude BETWEEN ? AND ?
			AND recorded_at > NOW() - INTERVAL '15 minutes'
		`, lat-latDelta, lat+latDelta, lng-lngDelta, lng+lngDelta).
		Count(&nearbyUsers)

	// Safety score calculation
	safetyScore := 100.0 - math.Min(float64(crimeStat.Count)*crimeStat.AvgSev*2.5, 100.0)
	if safetyScore < 0 {
		safetyScore = 0
	}
	crimeRate := 0.0
	if crimeStat.Count > 0 {
		crimeRate = math.Round(float64(crimeStat.Count)/30.0*10) / 10 // crimes per day averaged
	}

	c.JSON(http.StatusOK, gin.H{
		"safety_score":    math.Round(safetyScore*10) / 10,
		"nearby_users":    nearbyUsers,
		"recent_alerts":   recentAlerts,
		"crime_rate":      crimeRate,
		"last_updated":    time.Now().UTC().Format(time.RFC3339),
	})
}

// POST /api/v1/heatmap/report
func (h *HeatmapHandler) ReportIncident(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID, _ := userIDVal.(uint)

	var req struct {
		Type        string  `json:"type" binding:"required"`
		Latitude    float64 `json:"latitude" binding:"required"`
		Longitude   float64 `json:"longitude" binding:"required"`
		Description string  `json:"description"`
		Severity    float64 `json:"severity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default severity = 2 (medium) if not provided
	if req.Severity <= 0 || req.Severity > 4 {
		req.Severity = 2.0
	}

	var reportedBy *uint
	if userID > 0 {
		reportedBy = &userID
	}

	incident := models.CrimeIncident{
		Type:        req.Type,
		Severity:    req.Severity,
		Description: req.Description,
		OccurredAt:  time.Now(),
		Verified:    false, // user-submitted starts as unverified
		Source:      "user",
		ReportedBy:  reportedBy,
	}

	fmt.Printf("Incident location: lat=%f lng=%f\n", req.Latitude, req.Longitude)

	if err := h.db.Create(&incident).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save incident"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Incident reported successfully",
		"incident": incident,
	})
}

// GetTile is kept backward-compatible (PNG tile generation removed for simplicity, service layer still handles it)
func (h *HeatmapHandler) GetTile(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Tile endpoint active"})
}
