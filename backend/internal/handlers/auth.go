package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/obsidiannnn/Safe-Around/backend/internal/repository"
	"github.com/obsidiannnn/Safe-Around/backend/internal/utils"
	"github.com/redis/go-redis/v9"
)

type AuthHandler struct {
	repo  repository.UserRepo
	redis *redis.Client
}

func NewAuthHandler(repo repository.UserRepo, rdb *redis.Client) *AuthHandler {
	return &AuthHandler{
		repo:  repo,
		redis: rdb,
	}
}

type signupInput struct {
	Name     string `json:"name" binding:"required,min=2"`
	Phone    string `json:"phone" binding:"required,min=10"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type loginInput struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var input signupInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "check your input"})
		return
	}

	if existing, _ := h.repo.GetByPhone(input.Phone); existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "phone already in use"})
		return
	}
	if existing, _ := h.repo.GetByEmail(input.Email); existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already in use"})
		return
	}

	hash, err := utils.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not process password"})
		return
	}

	u := &models.User{
		Name:     input.Name,
		Phone:    input.Phone,
		Email:    input.Email,
		Password: hash,
	}

	if err := h.repo.Create(u); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create user"})
		return
	}

	access, err := utils.GenerateToken(u.ID, u.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error generating tokens"})
		return
	}

	refresh, err := utils.GenerateRefreshToken(u.ID, u.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error generating tokens"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "welcome!",
		"user":    u,
		"tokens": gin.H{
			"access":  access,
			"refresh": refresh,
		},
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input loginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad request"})
		return
	}

	ctx := context.Background()
	rlKey := "rl:login:" + input.Phone
	
	attempts, _ := h.redis.Get(ctx, rlKey).Int()
	if attempts >= 5 {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many attempts, chill for a bit"})
		return
	}

	u, err := h.repo.GetByPhone(input.Phone)
	if err != nil || !utils.ComparePassword(u.Password, input.Password) {
		h.redis.Incr(ctx, rlKey)
		h.redis.Expire(ctx, rlKey, 15*time.Minute)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	h.redis.Del(ctx, rlKey)
	now := time.Now()
	u.LastLogin = &now
	_ = h.repo.Update(u)

	access, _ := utils.GenerateToken(u.ID, u.Email)
	refresh, _ := utils.GenerateRefreshToken(u.ID, u.Email)

	c.JSON(http.StatusOK, gin.H{
		"user": u,
		"tokens": gin.H{
			"access":  access,
			"refresh": refresh,
		},
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var input struct {
		Token string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing token"})
		return
	}

	ctx := context.Background()
	if bl, _ := h.redis.Get(ctx, "bl:"+input.Token).Result(); bl == "1" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token revoked"})
		return
	}

	claims, err := utils.ValidateToken(input.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	u, err := h.repo.GetByID(claims.UserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	newAccess, _ := utils.GenerateToken(u.ID, u.Email)
	c.JSON(http.StatusOK, gin.H{"access_token": newAccess})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if len(token) > 7 {
		token = token[7:] // remove "Bearer "
	}

	claims, err := utils.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "logged out"}) // ignore err, just say ok
		return
	}

	ctx := context.Background()
	ttl := time.Until(claims.ExpiresAt.Time)
	if ttl > 0 {
		h.redis.Set(ctx, "bl:"+token, "1", ttl)
	}

	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}
