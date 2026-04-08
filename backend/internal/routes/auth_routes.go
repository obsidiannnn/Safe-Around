package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/handlers"
	"github.com/obsidiannnn/Safe-Around/backend/internal/middleware"
)

func SetupAuthRoutes(r *gin.RouterGroup, h *handlers.AuthHandler) {
	auth := r.Group("/auth")
	auth.POST("/otp/send", h.SendOTP)
	auth.POST("/otp/verify", h.VerifyOTP)
	auth.POST("/login", h.Login)
	auth.POST("/refresh", h.Refresh)

	protected := auth.Group("")
	protected.Use(middleware.AuthRequired())
	protected.POST("/password/setup", h.SetupProfile)
	protected.POST("/password/change", h.ChangePassword)
	protected.POST("/logout", h.Logout)
}
