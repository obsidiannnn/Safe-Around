package handlers

import (
	"crypto/md5"
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/services"
)

type HeatmapHandler struct {
	heatmapService *services.HeatmapService
}

func NewHeatmapHandler(hs *services.HeatmapService) *HeatmapHandler {
	return &HeatmapHandler{heatmapService: hs}
}

func (h *HeatmapHandler) GetTile(c *gin.Context) {
	z, _ := strconv.Atoi(c.Param("z"))
	x, _ := strconv.Atoi(c.Param("x"))
	y, _ := strconv.Atoi(c.Param("y"))

	// Validate zoom level
	if z < 8 || z > 18 {
		c.JSON(400, gin.H{"error": "Invalid zoom level (8-18)"})
		return
	}

	// Generate tile
	tileData, err := h.heatmapService.GenerateTile(c.Request.Context(), z, x, y)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate tile"})
		return
	}

	// Return PNG with proper headers
	c.Header("Content-Type", "image/png")
	c.Header("Cache-Control", "public, max-age=86400")
	c.Header("ETag", fmt.Sprintf(`"%x"`, md5.Sum(tileData)))
	c.Data(200, "image/png", tileData)
}
