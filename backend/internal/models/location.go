package models

import (
	"database/sql/driver"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"math"
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

	switch v := value.(type) {
	case string:
		if parsed, ok, err := parseLocationString(v); ok || err != nil {
			if err != nil {
				return err
			}
			*l = parsed
			return nil
		}
	case []byte:
		if parsed, err := parseLocationBytes(v); err == nil {
			*l = parsed
			return nil
		}

		if parsed, ok, err := parseLocationString(string(v)); ok || err != nil {
			if err != nil {
				return err
			}
			*l = parsed
			return nil
		}
	default:
		return fmt.Errorf("failed to scan Location: unsupported type %T", value)
	}

	return fmt.Errorf("failed to scan Location: unsupported location value")
}

func parseLocationString(raw string) (Location, bool, error) {
	wkbStr := strings.TrimSpace(raw)
	if wkbStr == "" {
		return Location{}, false, nil
	}

	if strings.HasPrefix(wkbStr, "SRID=") {
		parts := strings.SplitN(wkbStr, ";", 2)
		if len(parts) == 2 {
			wkbStr = parts[1]
		}
	}

	if strings.HasPrefix(strings.ToUpper(wkbStr), "POINT(") {
		coords := strings.TrimPrefix(strings.TrimSuffix(wkbStr, ")"), "POINT(")
		parts := strings.Fields(coords)
		if len(parts) != 2 {
			return Location{}, true, fmt.Errorf("failed to parse POINT coordinates")
		}

		lon, err := strconv.ParseFloat(parts[0], 64)
		if err != nil {
			return Location{}, true, err
		}
		lat, err := strconv.ParseFloat(parts[1], 64)
		if err != nil {
			return Location{}, true, err
		}
		return Location{Latitude: lat, Longitude: lon}, true, nil
	}

	if decoded, err := hex.DecodeString(wkbStr); err == nil {
		loc, err := parseEWKBPoint(decoded)
		return loc, true, err
	}

	return Location{}, false, nil
}

func parseLocationBytes(raw []byte) (Location, error) {
	trimmed := strings.TrimSpace(string(raw))
	if decoded, err := hex.DecodeString(trimmed); err == nil {
		return parseEWKBPoint(decoded)
	}

	return parseEWKBPoint(raw)
}

func parseEWKBPoint(data []byte) (Location, error) {
	if len(data) < 1+4+16 {
		return Location{}, fmt.Errorf("invalid EWKB point length")
	}

	var order binary.ByteOrder = binary.BigEndian
	switch data[0] {
	case 0:
		order = binary.BigEndian
	case 1:
		order = binary.LittleEndian
	default:
		return Location{}, fmt.Errorf("invalid EWKB byte order")
	}

	offset := 1
	geomType := order.Uint32(data[offset : offset+4])
	offset += 4

	hasSRID := geomType&0x20000000 != 0
	baseType := geomType &^ 0x20000000 &^ 0x40000000 &^ 0x80000000
	if baseType != 1 {
		return Location{}, fmt.Errorf("unsupported EWKB geometry type %d", baseType)
	}

	if hasSRID {
		if len(data) < offset+4+16 {
			return Location{}, fmt.Errorf("invalid EWKB SRID point length")
		}
		offset += 4
	}

	if len(data) < offset+16 {
		return Location{}, fmt.Errorf("invalid EWKB coordinate length")
	}

	xBits := order.Uint64(data[offset : offset+8])
	yBits := order.Uint64(data[offset+8 : offset+16])

	return Location{
		Latitude:  math.Float64frombits(yBits),
		Longitude: math.Float64frombits(xBits),
	}, nil
}
