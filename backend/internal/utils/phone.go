package utils

import "strings"

// NormalizePhone keeps phone matching predictable across auth, emergency contacts,
// and push/SMS fan-out. The app is India-first, so bare 10-digit numbers default to +91.
func NormalizePhone(phone string) string {
	trimmed := strings.TrimSpace(phone)
	if trimmed == "" {
		return ""
	}

	var digitsOnly strings.Builder
	for _, ch := range trimmed {
		if ch >= '0' && ch <= '9' {
			digitsOnly.WriteRune(ch)
		}
	}

	digits := digitsOnly.String()
	switch {
	case strings.HasPrefix(trimmed, "+") && digits != "":
		return "+" + digits
	case len(digits) == 10:
		return "+91" + digits
	case len(digits) == 12 && strings.HasPrefix(digits, "91"):
		return "+" + digits
	case digits != "":
		return "+" + digits
	default:
		return trimmed
	}
}
