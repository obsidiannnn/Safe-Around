package services

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"sort"
	"time"

	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// --- Public Types ----

type SafeRoute struct {
	RouteID          string      `json:"route_id"`
	Name             string      `json:"name"`
	DistanceMeters   int         `json:"distance_meters"`
	DurationMinutes  int         `json:"duration_minutes"`
	SafetyScore      int         `json:"safety_score"` // 0-100
	RiskLevel        string      `json:"risk_level"`
	DangerZonesCount int         `json:"danger_zones_count"`
	Polyline         string      `json:"polyline"`
	Color            string      `json:"color"`
}

// --- Internal Google Maps types ---

type googleDirectionsResponse struct {
	Routes []struct {
		OverviewPolyline struct {
			Points string `json:"points"`
		} `json:"overview_polyline"`
		Legs []struct {
			Distance struct {
				Value int `json:"value"`
			} `json:"distance"`
			Duration struct {
				Value int `json:"value"`
			} `json:"duration"`
		} `json:"legs"`
	} `json:"routes"`
	Status string `json:"status"`
}

type googleRoute struct {
	DistanceMeters  int
	DurationMinutes int
	Polyline        string
}

// --- Service ---

type RouteService struct {
	db         *gorm.DB
	redis      *redis.Client
	mapsAPIKey string
}

func NewRouteService(db *gorm.DB, rdb *redis.Client) *RouteService {
	return &RouteService{
		db:         db,
		redis:      rdb,
		mapsAPIKey: os.Getenv("GOOGLE_MAPS_API_KEY"),
	}
}

// CalculateSafeRoutes returns up to 3 routes ranked by a 60/40 safety/speed score.
func (rs *RouteService) CalculateSafeRoutes(ctx context.Context, origin, destination models.Location, mode string) ([]SafeRoute, error) {
	// 1. Check Redis cache
	cacheKey := rs.cacheKey(origin, destination, mode)
	if cached, err := rs.redis.Get(ctx, cacheKey).Bytes(); err == nil {
		var routes []SafeRoute
		if json.Unmarshal(cached, &routes) == nil {
			return routes, nil
		}
	}

	// 2. Fetch alternatives from Google Maps Directions API
	baseRoutes, err := rs.fetchGoogleRoutes(origin, destination, mode)
	if err != nil {
		return nil, fmt.Errorf("directions api: %w", err)
	}
	if len(baseRoutes) == 0 {
		return nil, fmt.Errorf("no routes returned from directions api")
	}

	// 3. Score each route for safety and build response
	var safeRoutes []SafeRoute
	for i, route := range baseRoutes {
		score, dangerCount := rs.scoreRoute(route.Polyline)
		safeRoutes = append(safeRoutes, SafeRoute{
			RouteID:          fmt.Sprintf("route_%d", i+1),
			Name:             rs.routeName(score, i),
			DistanceMeters:   route.DistanceMeters,
			DurationMinutes:  route.DurationMinutes,
			SafetyScore:      score,
			RiskLevel:        rs.riskLevel(score),
			DangerZonesCount: dangerCount,
			Polyline:         route.Polyline,
			Color:            rs.routeColor(score),
		})
	}

	// 4. Rank: 60% safety + 40% time efficiency
	ranked := rs.rankRoutes(safeRoutes)
	if len(ranked) > 3 {
		ranked = ranked[:3]
	}

	// 5. Cache result for 1 hour
	if data, err := json.Marshal(ranked); err == nil {
		rs.redis.Set(ctx, cacheKey, data, time.Hour)
	}

	return ranked, nil
}

// fetchGoogleRoutes calls the Directions API with alternatives=true
func (rs *RouteService) fetchGoogleRoutes(origin, destination models.Location, mode string) ([]googleRoute, error) {
	url := fmt.Sprintf(
		"https://maps.googleapis.com/maps/api/directions/json?origin=%f,%f&destination=%f,%f&mode=%s&alternatives=true&key=%s",
		origin.Latitude, origin.Longitude,
		destination.Latitude, destination.Longitude,
		mode,
		rs.mapsAPIKey,
	)

	resp, err := http.Get(url) //nolint:gosec // URL is constructed from validated inputs
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result googleDirectionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if result.Status != "OK" {
		return nil, fmt.Errorf("google maps api status: %s", result.Status)
	}

	var routes []googleRoute
	for _, r := range result.Routes {
		if len(r.Legs) == 0 {
			continue
		}
		leg := r.Legs[0]
		routes = append(routes, googleRoute{
			DistanceMeters:  leg.Distance.Value,
			DurationMinutes: leg.Duration.Value / 60,
			Polyline:        r.OverviewPolyline.Points,
		})
	}
	return routes, nil
}

// scoreRoute decodes the polyline, samples points every 100m, queries PostGIS for danger zones,
// and returns a 0-100 safety score plus the number of distinct danger zones crossed.
func (rs *RouteService) scoreRoute(encodedPolyline string) (int, int) {
	points := decodePolyline(encodedPolyline)
	if len(points) == 0 {
		return 75, 0 // safe neutral if polyline is empty
	}

	sampled := samplePoints(points, 100)

	totalScore := 0
	visitedCrimes := make(map[string]bool)

	for _, point := range sampled {
		var crime struct {
			ID        string
			WeightPct float64
		}

		// Query any crime hotspot near this route point (within 1km radius), taking the HIGHEST danger percentage
		query := `
			SELECT 
			  id, 
			  GREATEST(0.0, 
                CASE severity 
                    WHEN 4 THEN 100.0 
                    WHEN 3 THEN 75.0 
                    WHEN 2 THEN 50.0 
                    ELSE 25.0 
                END 
                - 
                (EXTRACT(EPOCH FROM (NOW() - occurred_at)) / 86400.0 * 
                CASE 
                    WHEN crime_type IN ('murder', 'rape') THEN 0.1 
                    WHEN crime_type IN ('robbery', 'kidnapping', 'assault') THEN 0.5 
                    ELSE 2.0 
                END)
              ) as weight_pct
			FROM crime_incidents
			WHERE ST_DWithin(location, ST_MakePoint(?, ?)::geography, 1000)
			ORDER BY weight_pct DESC
			LIMIT 1
		`
		err := rs.db.Raw(query, point.Longitude, point.Latitude).Scan(&crime).Error

		if err == nil && crime.ID != "" && crime.WeightPct > 0 {
			visitedCrimes[crime.ID] = true
			
			// Subtract safety score based purely on the severity %
			if crime.WeightPct >= 80 {
				totalScore -= 40
			} else if crime.WeightPct >= 50 {
				totalScore -= 25
			} else if crime.WeightPct >= 20 {
				totalScore -= 15
			} else {
				totalScore -= 5
			}
		} else {
			totalScore += 10
		}
	}

	// Normalize to 0-100
	n := len(sampled)
	safetyScore := 50
	if n > 0 {
		safetyScore = 50 + (totalScore / n)
	}
	if safetyScore < 0 {
		safetyScore = 0
	}
	if safetyScore > 100 {
		safetyScore = 100
	}

	return safetyScore, len(visitedCrimes)
}

// rankRoutes sorts routes by: (safetyScore * 0.6) + (timeEfficiency * 0.4)
func (rs *RouteService) rankRoutes(routes []SafeRoute) []SafeRoute {
	if len(routes) == 0 {
		return routes
	}

	fastestTime := routes[0].DurationMinutes
	for _, r := range routes {
		if r.DurationMinutes < fastestTime {
			fastestTime = r.DurationMinutes
		}
	}

	type scored struct {
		r     SafeRoute
		score float64
	}
	var list []scored

	for _, r := range routes {
		var timePenalty float64
		if fastestTime > 0 {
			timePenalty = float64(r.DurationMinutes-fastestTime) / float64(fastestTime) * 100
		}
		combined := float64(r.SafetyScore)*0.6 + (100-timePenalty)*0.4
		list = append(list, scored{r, combined})
	}

	sort.Slice(list, func(i, j int) bool {
		return list[i].score > list[j].score
	})

	out := make([]SafeRoute, len(list))
	for i, s := range list {
		out[i] = s.r
	}
	return out
}

// --- Helpers ---

func (rs *RouteService) routeName(score, index int) string {
	switch {
	case score >= 80:
		return "Safest Route"
	case score >= 60:
		return "Balanced Route"
	case index == 0:
		return "Fastest Route"
	default:
		return fmt.Sprintf("Route %d", index+1)
	}
}

func (rs *RouteService) riskLevel(score int) string {
	switch {
	case score >= 80:
		return "low"
	case score >= 60:
		return "medium"
	default:
		return "high"
	}
}

func (rs *RouteService) routeColor(score int) string {
	switch {
	case score >= 80:
		return "#4CAF50" // Green
	case score >= 60:
		return "#FFC107" // Amber
	default:
		return "#FF5722" // Red
	}
}

func (rs *RouteService) cacheKey(origin, destination models.Location, mode string) string {
	raw := fmt.Sprintf("%.5f,%.5f|%.5f,%.5f|%s", origin.Latitude, origin.Longitude, destination.Latitude, destination.Longitude, mode)
	return fmt.Sprintf("route:cache:%x", md5.Sum([]byte(raw)))
}

// --- Pure functions (exported for testing) ---

// decodePolyline decodes a Google Maps encoded polyline into a slice of lat/lng points.
func decodePolyline(encoded string) []models.Location {
	var points []models.Location
	index := 0
	lat := 0
	lng := 0

	for index < len(encoded) {
		var result, shift int
		var b int

		// Decode latitude delta
		result, shift = 0, 0
		for {
			b = int(encoded[index]) - 63
			index++
			result |= (b & 0x1f) << shift
			shift += 5
			if b < 0x20 {
				break
			}
		}
		if result&1 != 0 {
			lat += ^(result >> 1)
		} else {
			lat += result >> 1
		}

		// Decode longitude delta
		result, shift = 0, 0
		for {
			b = int(encoded[index]) - 63
			index++
			result |= (b & 0x1f) << shift
			shift += 5
			if b < 0x20 {
				break
			}
		}
		if result&1 != 0 {
			lng += ^(result >> 1)
		} else {
			lng += result >> 1
		}

		points = append(points, models.Location{
			Latitude:  float64(lat) / 1e5,
			Longitude: float64(lng) / 1e5,
		})
	}
	return points
}

// samplePoints returns points spaced at least intervalMeters apart (Haversine).
func samplePoints(points []models.Location, intervalMeters float64) []models.Location {
	if len(points) < 2 {
		return points
	}
	sampled := []models.Location{points[0]}
	accumulated := 0.0

	for i := 1; i < len(points); i++ {
		accumulated += haversineMeters(points[i-1], points[i])
		if accumulated >= intervalMeters {
			sampled = append(sampled, points[i])
			accumulated = 0
		}
	}
	// always include destination
	last := points[len(points)-1]
	if len(sampled) == 0 || sampled[len(sampled)-1] != last {
		sampled = append(sampled, last)
	}
	return sampled
}

// haversineMeters returns the great-circle distance in metres between two points.
func haversineMeters(a, b models.Location) float64 {
	const R = 6371000.0
	lat1 := a.Latitude * math.Pi / 180
	lat2 := b.Latitude * math.Pi / 180
	dLat := (b.Latitude - a.Latitude) * math.Pi / 180
	dLng := (b.Longitude - a.Longitude) * math.Pi / 180
	x := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return R * 2 * math.Atan2(math.Sqrt(x), math.Sqrt(1-x))
}
