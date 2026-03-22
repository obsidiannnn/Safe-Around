package services

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"math"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type GradientHeatmapService struct {
	db    *gorm.DB
	redis *redis.Client
}

type CrimePoint struct {
	Latitude  float64
	Longitude float64
	Severity  int
}

func NewGradientHeatmapService(db *gorm.DB, rdb *redis.Client) *GradientHeatmapService {
	return &GradientHeatmapService{
		db:    db,
		redis: rdb,
	}
}

func (hs *GradientHeatmapService) GenerateSmoothTile(z, x, y int) ([]byte, error) {
	// 1. Get tile boundaries in Lat/Lng
	minLat, minLng, maxLat, maxLng := hs.tileToLatLngBounds(z, x, y)
	
	// 2. Query crimes in these bounds (from the materialized view or incidents table)
	var crimes []CrimePoint
	err := hs.db.Raw(`
		SELECT ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude, severity 
		FROM crime_incidents 
		WHERE location && ST_MakeEnvelope(?, ?, ?, ?, 4326)
		  AND occurred_at > NOW() - INTERVAL '30 days'
		  AND verified = true
	`, minLng, minLat, maxLng, maxLat).Scan(&crimes).Error
	
	if err != nil {
		return nil, err
	}

	// 3. Create density map (512x512 for better sampling, downscale later)
	srcSize := 512
	densityMap := make([][]float64, srcSize)
	for i := range densityMap {
		densityMap[i] = make([]float64, srcSize)
	}

	// 4. Add heat for each crime incident
	for _, crime := range crimes {
		px, py := hs.latLngToPixel(crime.Latitude, crime.Longitude, z, x, y, srcSize)
		
		if px < 0 || px >= srcSize || py < 0 || py >= srcSize {
			continue
		}
		
		// Add heat with radius based on severity
		// On high zoom levels, radius should be smaller in pixels
		radius := float64(crime.Severity) * 20.0
		intensity := float64(crime.Severity) / 4.0
		
		hs.addHeatPoint(densityMap, px, py, radius, intensity)
	}

	// 5. Map density to colors with smooth gradients
	img := image.NewRGBA(image.Rect(0, 0, srcSize, srcSize))
	for yPos := 0; yPos < srcSize; yPos++ {
		for xPos := 0; xPos < srcSize; xPos++ {
			density := densityMap[yPos][xPos]
			if density > 0.01 {
				img.Set(xPos, yPos, hs.densityToGradientColor(density))
			}
		}
	}

	// 6. Encode to PNG
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func (hs *GradientHeatmapService) tileToLatLngBounds(z, x, y int) (float64, float64, float64, float64) {
	// Simple OSM tile to Lat/Lng conversion
	n := math.Pi - 2.0*math.Pi*float64(y)/math.Pow(2.0, float64(z))
	maxLat := 180.0 / math.Pi * math.Atan(0.5*(math.Exp(n)-math.Exp(-n)))
	minLng := float64(x)/math.Pow(2.0, float64(z))*360.0 - 180.0
	
	nNext := math.Pi - 2.0*math.Pi*float64(y+1)/math.Pow(2.0, float64(z))
	minLat := 180.0 / math.Pi * math.Atan(0.5*(math.Exp(nNext)-math.Exp(-nNext)))
	maxLng := float64(x+1)/math.Pow(2.0, float64(z))*360.0 - 180.0
	
	return minLat, minLng, maxLat, maxLng
}

func (hs *GradientHeatmapService) latLngToPixel(lat, lng float64, z, x, y, size int) (int, int) {
	// Convert Lat/Lng to relative pixel positions within the tile
	minLat, minLng, maxLat, maxLng := hs.tileToLatLngBounds(z, x, y)
	
	px := int(float64(size) * (lng - minLng) / (maxLng - minLng))
	// Latitudes are inverted in Y
	py := int(float64(size) * (1.0 - (lat - minLat)/(maxLat - minLat)))
	
	return px, py
}

func (hs *GradientHeatmapService) addHeatPoint(densityMap [][]float64, centerX, centerY int, radius, intensity float64) {
	size := len(densityMap)
	rInt := int(radius)
	
	for i := -rInt; i <= rInt; i++ {
		for j := -rInt; j <= rInt; j++ {
			xPos := centerX + i
			yPos := centerY + j
			
			if xPos >= 0 && xPos < size && yPos >= 0 && yPos < size {
				dist := math.Sqrt(float64(i*i + j*j))
				if dist <= radius {
					// Gaussian falloff
					falloff := math.Exp(-(dist * dist) / (2 * radius * radius / 4))
					densityMap[yPos][xPos] += intensity * falloff
				}
			}
		}
	}
}

func (hs *GradientHeatmapService) densityToGradientColor(density float64) color.RGBA {
	// Smooth color gradient:
	// 0.0 - 0.2: Transparent → Green
	// 0.2 - 0.4: Green → Yellow
	// 0.4 - 0.6: Yellow → Orange
	// 0.6 - 1.0: Orange → Red
	
	if density > 1.0 {
		density = 1.0
	}
	
	var r, g, b, a uint8
	
	if density < 0.2 {
		t := density / 0.2
		r, g, b = 0, uint8(200*t), 0
		a = uint8(150 * t)
	} else if density < 0.5 {
		t := (density - 0.2) / 0.3
		r, g, b = uint8(255*t), 200, 0
		a = 150
	} else if density < 0.8 {
		t := (density - 0.5) / 0.3
		r, g, b = 255, uint8(200*(1-t)), 0
		a = 180
	} else {
		t := (density - 0.8) / 0.2
		r, g, b = 255, 0, 0
		a = uint8(180 + 40*t)
	}
	
	return color.RGBA{R: r, G: g, B: b, A: a}
}
