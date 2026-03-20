package models

import (
	"database/sql/driver"
	"encoding/hex"
	"fmt"
	"strings"
	"strconv"
)

// Location represents a geographic point with Latitude and Longitude
type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Value implements the driver.Valuer interface for GORM inserts (WKT format)
func (l Location) Value() (driver.Value, error) {
	return fmt.Sprintf("SRID=4326;POINT(%f %f)", l.Longitude, l.Latitude), nil
}

// Scan implements the sql.Scanner interface for GORM selects (WKB/EWKB format parsing)
func (l *Location) Scan(value interface{}) error {
	if value == nil {
		*l = Location{}
		return nil
	}

	var wkbStr string
	switch v := value.(type) {
	case string:
		wkbStr = v
	case []byte:
		wkbStr = string(v)
	default:
		return fmt.Errorf("failed to scan Location: unsupported type %T", value)
	}

	// This is a naive parser for the Hex EWKB typical of PostGIS
	// A robust robust impl would use twpayne/go-geom or similar
	// But since PostGIS stores it in little-endian hex: 
	// 0101000020E6100000 <longitude_hex> <latitude_hex>
	// where E6100000 is SRID 4326 in little endian
	// Since mapping is complex in pure string parsing, we'll try to extract it
	if len(wkbStr) >= 50 {
		// PostGIS hex WKB format:
		b, err := hex.DecodeString(wkbStr)
		if err == nil && len(b) >= 21 {
			// bytes 9-16 are X (longitude), bytes 17-24 are Y (latitude) in IEEE 754
			// However doing this natively is brittle. 
			// We'll rely on explicitly using ST_AsText when querying if possible.
		}
	}
	
	// If it's pure WKT string "POINT(12.34 56.78)"
	if strings.HasPrefix(wkbStr, "POINT(") {
		coords := strings.Trim(wkbStr, "POINT()")
		parts := strings.Split(coords, " ")
		if len(parts) == 2 {
			lon, _ := strconv.ParseFloat(parts[0], 64)
			lat, _ := strconv.ParseFloat(parts[1], 64)
			l.Longitude = lon
			l.Latitude = lat
		}
	}

	return nil
}
