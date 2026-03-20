package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/obsidiannnn/Safe-Around/backend/internal/services"
)

type RouteHandler struct {
	routeSvc *services.RouteService
}

func NewRouteHandler(svc *services.RouteService) *RouteHandler {
	return &RouteHandler{routeSvc: svc}
}

type safeRouteRequest struct {
	Origin      models.Location `json:"origin" binding:"required"`
	Destination models.Location `json:"destination" binding:"required"`
	Mode        string          `json:"mode" binding:"required"` // walking, driving, transit
}

// GetSafeRoutes handles POST /api/v1/routes/safe
func (h *RouteHandler) GetSafeRoutes(c *gin.Context) {
	var req safeRouteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate mode
	switch req.Mode {
	case "walking", "driving", "transit", "bicycling":
		// valid
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "mode must be one of: walking, driving, transit, bicycling"})
		return
	}

	routes, err := h.routeSvc.CalculateSafeRoutes(c.Request.Context(), req.Origin, req.Destination, req.Mode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate safe routes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"routes": routes,
			"count":  len(routes),
		},
	})
}
