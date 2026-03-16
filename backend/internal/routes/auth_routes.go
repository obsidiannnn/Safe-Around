package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/handlers"
	"github.com/obsidiannnn/Safe-Around/backend/internal/middleware"
)

func SetupAuthRoutes(r *gin.RouterGroup, h *handlers.AuthHandler) {
	auth := r.Group("/auth")
	
	auth.POST("/signup", h.Signup)
	auth.POST("/login", h.Login)
	auth.POST("/refresh", h.Refresh)

	protected := auth.Group("")
	protected.Use(middleware.AuthRequired())
	protected.POST("/logout", h.Logout)
}
