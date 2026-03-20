package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/utils"
)

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing auth header"})
			return
		}

		parts := strings.Split(auth, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid auth format"})
			return
		}

		userID, email, err := utils.ExtractClaims(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		c.Set("user_id", userID)
		c.Set("user_email", email)
		c.Next()
	}
}

// GetCurrentUserID extracts the authenticated userID from the Gin context.
func GetCurrentUserID(c *gin.Context) uint {
	val, _ := c.Get("user_id")
	id, _ := val.(uint)
	return id
}
