package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/obsidiannnn/Safe-Around/backend/internal/utils"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type ProfileHandler struct {
	db    *gorm.DB
	redis *redis.Client
}

func NewProfileHandler(db *gorm.DB, redis *redis.Client) *ProfileHandler {
	return &ProfileHandler{db: db, redis: redis}
}

// GET /api/v1/users/profile
// Returns the authenticated user's full profile with live statistics
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	cacheKey := profileCacheKey(userID)
	if cached, ok := h.getCachedProfile(c.Request.Context(), cacheKey); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	type profileRow struct {
		ID                   uint       `json:"id"`
		Name                 string     `json:"name"`
		Phone                string     `json:"phone"`
		Email                string     `json:"email"`
		IsPhoneVerified      bool       `json:"is_phone_verified"`
		ProfilePictureURL    string     `json:"profile_picture_url"`
		SubscriptionTier     string     `json:"subscription_tier"`
		TotalAlertsTriggered int64      `json:"total_alerts_triggered"`
		PeopleHelpedCount    int64      `json:"people_helped_count"`
		EmergencyContacts    int64      `json:"emergency_contacts"`
		LastLogin            *time.Time `json:"last_login"`
		CreatedAt            time.Time  `json:"created_at"`
		UpdatedAt            time.Time  `json:"updated_at"`
	}

	var row profileRow
	err := h.db.Raw(`
		SELECT
			u.id,
			u.name,
			u.phone,
			u.email,
			u.is_phone_verified,
			u.profile_picture_url,
			u.subscription_tier,
			u.last_login,
			u.created_at,
			u.updated_at,
			COALESCE((
				SELECT COUNT(*)
				FROM emergency_alerts ea
				WHERE ea.user_id = u.id
			), 0) AS total_alerts_triggered,
			COALESCE((
				SELECT COUNT(*)
				FROM alert_responses ar
				WHERE ar.responder_user_id = u.id
				  AND ar.response_status IN ('accepted', 'arrived', 'helping')
			), 0) AS people_helped_count,
			COALESCE((
				SELECT COUNT(*)
				FROM emergency_contacts ec
				WHERE ec.user_id = u.id
			), 0) AS emergency_contacts
		FROM users u
		WHERE u.id = ? AND u.deleted_at IS NULL
		LIMIT 1
	`, userID).Scan(&row).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load profile"})
		return
	}
	if row.ID == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	trustLevelScore := calculateTrustLevelScore(models.User{
		Email:           row.Email,
		IsPhoneVerified: row.IsPhoneVerified,
	}, row.TotalAlertsTriggered, row.PeopleHelpedCount, row.EmergencyContacts)

	response := gin.H{
		"user": gin.H{
			"id":                     row.ID,
			"name":                   row.Name,
			"phone":                  row.Phone,
			"email":                  row.Email,
			"is_phone_verified":      row.IsPhoneVerified,
			"profile_picture_url":    row.ProfilePictureURL,
			"subscription_tier":      row.SubscriptionTier,
			"total_alerts_triggered": row.TotalAlertsTriggered,
			"people_helped_count":    row.PeopleHelpedCount,
			"trust_level_score":      trustLevelScore,
			"emergency_contacts":     row.EmergencyContacts,
			"last_login":             row.LastLogin,
			"created_at":             row.CreatedAt,
			"updated_at":             row.UpdatedAt,
		},
	}

	h.cacheProfile(c.Request.Context(), cacheKey, response)
	c.JSON(http.StatusOK, response)
}

func calculateTrustLevelScore(user models.User, totalAlerts, peopleHelped, emergencyContacts int64) int {
	score := 40
	if user.IsPhoneVerified {
		score += 25
	}
	if user.Email != "" {
		score += 10
	}
	if emergencyContacts > 0 {
		score += 15
	}
	score += int(peopleHelped * 5)
	if totalAlerts > 0 && peopleHelped == 0 {
		score -= 5
	}
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

// PUT /api/v1/users/profile
// Updates name, email, and/or profile picture of the authenticated user
func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	var req struct {
		Name                string `json:"name"`
		Email               string `json:"email"`
		ProfilePictureURL   string `json:"profile_picture_url"`
		ClearProfilePicture bool   `json:"clear_profile_picture"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.ClearProfilePicture {
		updates["profile_picture_url"] = ""
	} else if req.ProfilePictureURL != "" {
		updates["profile_picture_url"] = req.ProfilePictureURL
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	if err := h.db.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	h.invalidateProfileCache(c.Request.Context(), userID)

	var updatedUser models.User
	h.db.First(&updatedUser, userID)
	c.JSON(http.StatusOK, gin.H{"message": "Profile updated", "user": updatedUser})
}

// POST /api/v1/users/profile/photo
// Uploads and updates the authenticated user's profile photo.
func (h *ProfileHandler) UploadProfilePhoto(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	file, header, err := c.Request.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "photo file is required"})
		return
	}
	defer file.Close()

	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "photo must be 5MB or smaller"})
		return
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		buffer := make([]byte, 512)
		n, _ := file.Read(buffer)
		contentType = http.DetectContentType(buffer[:n])
		if seeker, ok := file.(io.Seeker); ok {
			_, _ = seeker.Seek(0, io.SeekStart)
		}
	}

	if !strings.HasPrefix(contentType, "image/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only image uploads are supported"})
		return
	}

	uploadsDir := resolveProfileUploadsDir()
	if err := os.MkdirAll(uploadsDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare upload storage"})
		return
	}

	extension := filepath.Ext(header.Filename)
	if extension == "" {
		if exts, _ := mime.ExtensionsByType(contentType); len(exts) > 0 {
			extension = exts[0]
		}
	}
	if extension == "" {
		extension = ".jpg"
	}

	filename := fmt.Sprintf("user-%d-%d%s", userID, time.Now().UnixNano(), extension)
	destination := filepath.Join(uploadsDir, filename)
	if err := c.SaveUploadedFile(header, destination); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store uploaded photo"})
		return
	}

	photoURL := buildPublicUploadURL(c, filename)
	if err := h.db.Model(&models.User{}).
		Where("id = ?", userID).
		Update("profile_picture_url", photoURL).Error; err != nil {
		_ = os.Remove(destination)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile photo"})
		return
	}

	h.invalidateProfileCache(c.Request.Context(), userID)

	var updatedUser models.User
	if err := h.db.First(&updatedUser, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load updated profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile photo updated",
		"user":    updatedUser,
	})
}

// GET /api/v1/users/contacts
// Returns all emergency contacts for the authenticated user
func (h *ProfileHandler) GetContacts(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	var contacts []models.EmergencyContact
	h.db.Where("user_id = ?", userID).Order("is_priority DESC, created_at ASC").Find(&contacts)

	c.JSON(http.StatusOK, gin.H{"contacts": contacts})
}

// POST /api/v1/users/contacts
// Adds a new emergency contact for the authenticated user
func (h *ProfileHandler) AddContact(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	var req struct {
		Name         string `json:"name" binding:"required"`
		Phone        string `json:"phone" binding:"required"`
		Relationship string `json:"relationship"`
		IsPriority   bool   `json:"is_priority"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.Phone = utils.NormalizePhone(req.Phone)

	// Max 5 contacts per user
	var count int64
	h.db.Model(&models.EmergencyContact{}).Where("user_id = ?", userID).Count(&count)
	if count >= 5 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Maximum 5 emergency contacts allowed"})
		return
	}

	contact := models.EmergencyContact{
		UserID:       userID,
		Name:         req.Name,
		Phone:        req.Phone,
		Relationship: req.Relationship,
		IsPriority:   req.IsPriority,
	}
	if err := h.db.Create(&contact).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save contact"})
		return
	}

	h.invalidateProfileCache(c.Request.Context(), userID)
	c.JSON(http.StatusCreated, gin.H{"message": "Contact added", "contact": contact})
}

// DELETE /api/v1/users/contacts/:id
// Deletes a specific emergency contact
func (h *ProfileHandler) DeleteContact(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	contactIDStr := c.Param("id")
	contactID, err := strconv.Atoi(contactIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contact ID"})
		return
	}

	// Ensure the contact belongs to the requesting user
	result := h.db.Where("id = ? AND user_id = ?", contactID, userID).
		Delete(&models.EmergencyContact{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	}

	h.invalidateProfileCache(c.Request.Context(), userID)
	c.JSON(http.StatusOK, gin.H{"message": "Contact deleted"})
}

func profileCacheKey(userID uint) string {
	return fmt.Sprintf("profile:summary:%d", userID)
}

func (h *ProfileHandler) getCachedProfile(ctx context.Context, cacheKey string) (gin.H, bool) {
	if h.redis == nil {
		return nil, false
	}

	cached, err := h.redis.Get(ctx, cacheKey).Result()
	if err != nil || cached == "" {
		return nil, false
	}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(cached), &payload); err != nil {
		return nil, false
	}

	return gin.H(payload), true
}

func (h *ProfileHandler) cacheProfile(ctx context.Context, cacheKey string, payload gin.H) {
	if h.redis == nil {
		return
	}

	encoded, err := json.Marshal(payload)
	if err != nil {
		return
	}

	h.redis.Set(ctx, cacheKey, encoded, 30*time.Second)
}

func (h *ProfileHandler) invalidateProfileCache(ctx context.Context, userID uint) {
	if h.redis == nil {
		return
	}

	h.redis.Del(ctx, profileCacheKey(userID))
}

func resolveProfileUploadsDir() string {
	if dir := strings.TrimSpace(os.Getenv("PROFILE_UPLOAD_DIR")); dir != "" {
		return filepath.Join(dir, "profile-pictures")
	}
	return filepath.Join(".", "uploads", "profile-pictures")
}

func buildPublicUploadURL(c *gin.Context, filename string) string {
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	host := c.Request.Host
	return fmt.Sprintf("%s://%s/uploads/profile-pictures/%s", scheme, host, filename)
}
