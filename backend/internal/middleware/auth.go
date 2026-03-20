package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Claims holds the JWT payload we embed in every token.
type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// AuthRequired validates the Bearer JWT token on every protected route.
// It sets "user_id" and "user_email" in the Gin context for downstream handlers.
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header is required",
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header must be 'Bearer <token>'",
			})
			return
		}

		tokenString := parts[1]
		secret := []byte(os.Getenv("JWT_SECRET"))

		token, err := jwt.ParseWithClaims(tokenString, &Claims{},
			func(t *jwt.Token) (interface{}, error) {
				// Guard against algorithm confusion attacks:
				// reject any token not signed with HMAC.
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing algorithm: %v", t.Header["alg"])
				}
				return secret, nil
			},
		)

		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			return
		}

		if !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Token is not valid",
			})
			return
		}

		claims, ok := token.Claims.(*Claims)
		if !ok || claims.UserID == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token claims",
			})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Next()
	}
}

// GetCurrentUserID extracts the authenticated userID from the Gin context.
func GetCurrentUserID(c *gin.Context) uint {
	val, _ := c.Get("user_id")
	id, _ := val.(uint)
	return id
}
