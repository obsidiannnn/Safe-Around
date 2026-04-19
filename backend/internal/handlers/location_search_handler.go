package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/maps"
)

type LocationSearchHandler struct {
	mapsClient *maps.Client
}

func NewLocationSearchHandler(mapsClient *maps.Client) *LocationSearchHandler {
	return &LocationSearchHandler{
		mapsClient: mapsClient,
	}
}

// SearchLocation godoc
// @Summary Search for a location by address
// @Description Geocode an address string to get latitude and longitude
// @Tags location
// @Accept json
// @Produce json
// @Param query query string true "Search query (address)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/location/search [get]
func (h *LocationSearchHandler) SearchLocation(c *gin.Context) {
	query := c.Query("query")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "query parameter is required",
		})
		return
	}

	// Geocode the address
	location, err := h.mapsClient.GeocodeAddress(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to geocode address",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"latitude":  location.Lat,
			"longitude": location.Lng,
			"address":   query,
		},
	})
}

// ReverseGeocode godoc
// @Summary Reverse geocode coordinates to address
// @Description Convert latitude and longitude to a formatted address
// @Tags location
// @Accept json
// @Produce json
// @Param lat query number true "Latitude"
// @Param lng query number true "Longitude"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/location/reverse [get]
func (h *LocationSearchHandler) ReverseGeocode(c *gin.Context) {
	var req struct {
		Lat float64 `form:"lat" binding:"required"`
		Lng float64 `form:"lng" binding:"required"`
	}

	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid parameters",
			"message": err.Error(),
		})
		return
	}

	// Reverse geocode the coordinates
	address, err := h.mapsClient.ReverseGeocode(req.Lat, req.Lng)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to reverse geocode",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"latitude":  req.Lat,
			"longitude": req.Lng,
			"address":   address,
		},
	})
}
