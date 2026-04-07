package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"gorm.io/gorm"
)

type ProfileHandler struct {
	db *gorm.DB
}

func NewProfileHandler(db *gorm.DB) *ProfileHandler {
	return &ProfileHandler{db: db}
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

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var totalAlerts int64
	h.db.Model(&models.EmergencyAlert{}).
		Where("user_id = ?", userID).
		Count(&totalAlerts)

	var peopleHelped int64
	h.db.Model(&models.AlertResponse{}).
		Where("responder_user_id = ? AND response_status IN ?", userID, []string{"accepted", "arrived", "helping"}).
		Count(&peopleHelped)

	var emergencyContacts int64
	h.db.Model(&models.EmergencyContact{}).
		Where("user_id = ?", userID).
		Count(&emergencyContacts)

	trustLevelScore := calculateTrustLevelScore(user, totalAlerts, peopleHelped, emergencyContacts)

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":                     user.ID,
			"name":                   user.Name,
			"phone":                  user.Phone,
			"email":                  user.Email,
			"is_phone_verified":      user.IsPhoneVerified,
			"profile_picture_url":    user.ProfilePictureURL,
			"subscription_tier":      user.SubscriptionTier,
			"total_alerts_triggered": totalAlerts,
			"people_helped_count":    peopleHelped,
			"trust_level_score":      trustLevelScore,
			"emergency_contacts":     emergencyContacts,
			"last_login":             user.LastLogin,
			"created_at":             user.CreatedAt,
			"updated_at":             user.UpdatedAt,
		},
	})
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
		Name              string `json:"name"`
		Email             string `json:"email"`
		ProfilePictureURL string `json:"profile_picture_url"`
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
	if req.ProfilePictureURL != "" {
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

	var updatedUser models.User
	h.db.First(&updatedUser, userID)
	c.JSON(http.StatusOK, gin.H{"message": "Profile updated", "user": updatedUser})
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

	c.JSON(http.StatusOK, gin.H{"message": "Contact deleted"})
}
