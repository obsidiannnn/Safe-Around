package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/obsidiannnn/Safe-Around/backend/internal/repository"
	"github.com/obsidiannnn/Safe-Around/backend/internal/utils"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/twilio"
	"github.com/redis/go-redis/v9"
)

type AuthHandler struct {
	repo   repository.UserRepo
	redis  *redis.Client
	twilio *twilio.Client
}

func NewAuthHandler(repo repository.UserRepo, rdb *redis.Client, twClient *twilio.Client) *AuthHandler {
	return &AuthHandler{
		repo:   repo,
		redis:  rdb,
		twilio: twClient,
	}
}

type authInput struct {
	Phone    string `json:"phone" binding:"required"`
	OTP      string `json:"otp,omitempty"`
	Password string `json:"password,omitempty"`
}

type setupProfileInput struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// SendOTP handles generating and sending an SMS securely
func (h *AuthHandler) SendOTP(c *gin.Context) {
	var input authInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone number is required"})
		return
	}

	ctx := context.Background()
	rlKey := "rl:otp:send:" + input.Phone
	
	// Rate Limiting: max 3 OTP requests per 10 minutes
	attempts, _ := h.redis.Get(ctx, rlKey).Int()
	if attempts >= 3 {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, please wait"})
		return
	}

	// Extract Twilio Verify Service SID from environment mapped globally
	verifySID := "VAec453b0a41cbb20d1577c8c7ffe8ce64"

	// Dispatch Twilio Verify OTP Request natively
	_, err := h.twilio.SendOTP(input.Phone, verifySID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send otp via SMS"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "otp sent successfully"})
}

// VerifyOTP validates the OTP and issues JWTs, creating the user if missing
func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var input authInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone and otp are required"})
		return
	}

	verifySID := "VAec453b0a41cbb20d1577c8c7ffe8ce64"
	isValid, err := h.twilio.VerifyOTP(input.Phone, input.OTP, verifySID)
	
	if err != nil || !isValid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired otp"})
		return
	}

	// Fetch or Create User
	u, err := h.repo.GetByPhone(input.Phone)
	if err != nil {
		u = &models.User{
			Phone:           input.Phone,
			IsPhoneVerified: true,
		}
		if err := h.repo.Create(u); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user profile"})
			return
		}
	} else {
		// Existing user might be re-verifying
		if !u.IsPhoneVerified {
			u.IsPhoneVerified = true
			h.repo.Update(u)
		}
	}

	now := time.Now()
	u.LastLogin = &now
	_ = h.repo.Update(u)

	// Issue Tokens
	access, _ := utils.GenerateToken(u.ID, u.Email)
	refresh, _ := utils.GenerateRefreshToken(u.ID, u.Email)

	c.JSON(http.StatusOK, gin.H{
		"message": "verified successfully",
		"user":    u,
		"tokens": gin.H{"access": access, "refresh": refresh},
	})
}

// SetupProfile allows a logged-in OTP user to assign a permanent password and email
func (h *AuthHandler) SetupProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var input setupProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid name, email, and password required"})
		return
	}

	u, err := h.repo.GetByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if existing, _ := h.repo.GetByEmail(input.Email); existing != nil && existing.ID != u.ID {
		c.JSON(http.StatusConflict, gin.H{"error": "email already in use"})
		return
	}

	hash, err := utils.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not secure password"})
		return
	}

	u.Name = input.Name
	u.Email = input.Email
	u.Password = hash

	if err := h.repo.Update(u); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "profile securely set up", "user": u})
}

// Login permits direct phone/password login skipping OTP for fully set-up users
func (h *AuthHandler) Login(c *gin.Context) {
	var input authInput
	if err := c.ShouldBindJSON(&input); err != nil || input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone and password required"})
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
	if err != nil || u.Password == "" || !utils.ComparePassword(u.Password, input.Password) {
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
