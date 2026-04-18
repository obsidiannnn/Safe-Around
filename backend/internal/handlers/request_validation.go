package handlers

import (
	"fmt"
	"regexp"
)

var e164PhonePattern = regexp.MustCompile(`^\+[1-9]\d{7,14}$`)

func validateCoordinates(latitude, longitude float64) error {
	if latitude < -90 || latitude > 90 {
		return fmt.Errorf("latitude must be between -90 and 90")
	}
	if longitude < -180 || longitude > 180 {
		return fmt.Errorf("longitude must be between -180 and 180")
	}
	return nil
}

func validateRadius(radius, minValue, maxValue int) error {
	if radius < minValue || radius > maxValue {
		return fmt.Errorf("radius must be between %d and %d", minValue, maxValue)
	}
	return nil
}

func validatePhoneNumber(phone string) error {
	if !e164PhonePattern.MatchString(phone) {
		return fmt.Errorf("phone number must be in international format")
	}
	return nil
}
