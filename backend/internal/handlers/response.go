package handlers

import (
	"time"

	"github.com/google/uuid"
)

type MetaData struct {
	Timestamp string `json:"timestamp"`
	RequestID string `json:"request_id"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type APIResponse struct {
	Success bool         `json:"success"`
	Data    interface{}  `json:"data,omitempty"`
	Error   *ErrorDetail `json:"error,omitempty"`
	Meta    MetaData     `json:"meta"`
}

type PaginatedData struct {
	Items      interface{} `json:"items"`
	TotalItems int64       `json:"total_items"`
	TotalPages int         `json:"total_pages"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
}

func getMeta() MetaData {
	return MetaData{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		RequestID: uuid.New().String(),
	}
}

// SuccessResponse generates a standardized success response structure.
func SuccessResponse(data interface{}) APIResponse {
	return APIResponse{
		Success: true,
		Data:    data,
		Meta:    getMeta(),
	}
}

// ErrorResponse generates a standardized error response structure.
func ErrorResponse(code string, message string) APIResponse {
	return APIResponse{
		Success: false,
		Error: &ErrorDetail{
			Code:    code,
			Message: message,
		},
		Meta: getMeta(),
	}
}

// PaginatedResponse generates a standardized success response containing paginated data.
func PaginatedResponse(items interface{}, totalItems int64, totalPages, page, limit int) APIResponse {
	data := PaginatedData{
		Items:      items,
		TotalItems: totalItems,
		TotalPages: totalPages,
		Page:       page,
		Limit:      limit,
	}
	return SuccessResponse(data)
}
