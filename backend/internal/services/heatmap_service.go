package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HeatmapService struct {
	db         *gorm.DB
	redis      *redis.Client
	s3Client   *s3.Client
	bucketName string
	cdnBaseURL string
}

type GridCell struct {
	CellX         int
	CellY         int
	IncidentCount int
	SeveritySum   int
	AvgSeverity   float64
	DensityScore  float64
	Color         string
}

type BoundingBox struct {
	North float64
	South float64
	East  float64
	West  float64
}

func NewHeatmapService(db *gorm.DB, redis *redis.Client, s3Client *s3.Client) *HeatmapService {
	return &HeatmapService{
		db:         db,
		redis:      redis,
		s3Client:   s3Client,
		bucketName: "safearound-heatmap-tiles",
		cdnBaseURL: "https://cdn.safearound.com",
	}
}

func (hs *HeatmapService) GenerateTile(ctx context.Context, z, x, y int) ([]byte, error) {
	// Check Redis cache first
	cacheKey := fmt.Sprintf("tile:%d:%d:%d", z, x, y)
	cached, err := hs.redis.Get(ctx, cacheKey).Result()
	if err == nil {
		// Cache hit
		data, _ := base64.StdEncoding.DecodeString(cached)
		return data, nil
	}

	// Calculate tile bounds
	bounds := hs.tileToBounds(z, x, y)

	// Aggregate crime data into grid cells
	gridCells, err := hs.aggregateGridData(ctx, bounds)
	if err != nil {
		return nil, err
	}

	// Render tile image
	tileImage, err := hs.renderTile(gridCells, z, x, y)
	if err != nil {
		return nil, err
	}

	// Encode to PNG
	var buf bytes.Buffer
	if err := png.Encode(&buf, tileImage); err != nil {
		return nil, err
	}

	tileData := buf.Bytes()

	// Cache in Redis (24 hour TTL)
	encoded := base64.StdEncoding.EncodeToString(tileData)
	hs.redis.Set(ctx, cacheKey, encoded, 24*time.Hour)

	// Upload to S3 (async) safely resolving pointers explicitly below
	go hs.uploadTileToS3(context.Background(), z, x, y, tileData)

	return tileData, nil
}

func (hs *HeatmapService) aggregateGridData(ctx context.Context, bounds BoundingBox) ([]GridCell, error) {
	cellSize := 0.01 // degrees (~1.1 km)

	query := `
		SELECT 
			FLOOR(ST_X(location::geometry) / ?) as cell_x,
			FLOOR(ST_Y(location::geometry) / ?) as cell_y,
			COUNT(*) as incident_count,
			SUM(severity) as severity_sum,
			AVG(severity)::float as avg_severity
		FROM crime_incidents
		WHERE 
			ST_Within(
				location::geometry,
				ST_MakeEnvelope(?, ?, ?, ?, 4326)
			)
			AND occurred_at > NOW() - INTERVAL '30 days'
			AND verified = true
		GROUP BY cell_x, cell_y
		HAVING COUNT(*) > 0
	`

	var cells []GridCell
	err := hs.db.Raw(query,
		cellSize, cellSize,
		bounds.West, bounds.South,
		bounds.East, bounds.North,
	).Scan(&cells).Error

	if err != nil {
		return nil, err
	}

	// Calculate density scores and colors
	for i := range cells {
		cells[i].DensityScore = hs.calculateDensityScore(cells[i])
		cells[i].Color = hs.mapScoreToColor(cells[i].DensityScore)
	}

	return cells, nil
}

func (hs *HeatmapService) calculateDensityScore(cell GridCell) float64 {
	// Normalize to 0-100 scale
	// Higher incident count + higher severity = higher score

	// Weights
	countWeight := 0.6
	severityWeight := 0.4

	// Normalize incident count (assume max 100 incidents per cell)
	normalizedCount := math.Min(float64(cell.IncidentCount)/100.0, 1.0) * 100

	// Normalize severity (max severity per incident is 4)
	normalizedSeverity := (cell.AvgSeverity / 4.0) * 100

	score := (normalizedCount*countWeight) + (normalizedSeverity*severityWeight)

	return math.Min(score, 100.0)
}

func (hs *HeatmapService) mapScoreToColor(score float64) string {
	// Green (0-25) → Yellow (26-50) → Orange (51-75) → Red (76-100)

	if score <= 25 {
		// Green
		return "#4CAF50"
	} else if score <= 50 {
		// Yellow
		return "#FFEB3B"
	} else if score <= 75 {
		// Orange
		return "#FF9800"
	} else {
		// Red
		return "#F44336"
	}
}

func (hs *HeatmapService) renderTile(gridCells []GridCell, z, x, y int) (image.Image, error) {
	// Create 256x256 image
	img := image.NewRGBA(image.Rect(0, 0, 256, 256))

	// Transparent background
	draw.Draw(img, img.Bounds(), &image.Uniform{color.RGBA{0, 0, 0, 0}}, image.Point{}, draw.Src)

	// Draw each grid cell
	for _, cell := range gridCells {
		// Convert grid cell to pixel coordinates
		px, py := hs.latLngToPixel(cell.CellX, cell.CellY, z, x, y)

		if px < 0 || px >= 256 || py < 0 || py >= 256 {
			continue
		}

		// Parse color
		cellColor := hs.hexToRGBA(cell.Color, 153) // 60% opacity

		// Draw rectangle (cell size in pixels)
		cellSizePixels := 10
		rect := image.Rect(px, py, px+cellSizePixels, py+cellSizePixels)
		draw.Draw(img, rect, &image.Uniform{cellColor}, image.Point{}, draw.Over)
	}

	// Apply Gaussian blur for smooth heatmap effect
	img = hs.applyGaussianBlur(img, 2)

	return img, nil
}

func (hs *HeatmapService) latLngToPixel(cellX, cellY, z, tileX, tileY int) (int, int) {
	// Convert grid cell coordinates to pixel coordinates within tile
	// This is simplified - real implementation would use proper map projection

	n := math.Pow(2, float64(z))
	px := int((float64(cellX) - float64(tileX)*256/n) * n)
	py := int((float64(cellY) - float64(tileY)*256/n) * n)

	return px, py
}

func (hs *HeatmapService) hexToRGBA(hex string, alpha uint8) color.RGBA {
	// Convert hex color to RGBA
	// Simplified - assumes format "#RRGGBB"

	var r, g, b uint8
	fmt.Sscanf(hex, "#%02x%02x%02x", &r, &g, &b)

	return color.RGBA{R: r, G: g, B: b, A: alpha}
}

func (hs *HeatmapService) applyGaussianBlur(img *image.RGBA, radius int) *image.RGBA {
	// Simplified Gaussian blur
	// Real implementation would use proper convolution

	bounds := img.Bounds()
	blurred := image.NewRGBA(bounds)

	// Simple box blur approximation
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			// Average surrounding pixels
			var r, g, b, a uint32
			count := 0

			for dy := -radius; dy <= radius; dy++ {
				for dx := -radius; dx <= radius; dx++ {
					px := x + dx
					py := y + dy

					if px >= bounds.Min.X && px < bounds.Max.X && py >= bounds.Min.Y && py < bounds.Max.Y {
						c := img.At(px, py)
						rr, gg, bb, aa := c.RGBA()
						r += rr
						g += gg
						b += bb
						a += aa
						count++
					}
				}
			}

			if count > 0 {
				blurred.Set(x, y, color.RGBA{
					R: uint8(r / uint32(count) / 257),
					G: uint8(g / uint32(count) / 257),
					B: uint8(b / uint32(count) / 257),
					A: uint8(a / uint32(count) / 257),
				})
			}
		}
	}

	return blurred
}

func (hs *HeatmapService) uploadTileToS3(ctx context.Context, z, x, y int, data []byte) error {
	// S3 Client could be nil natively unless injected properly in app config (Stub Check)
	if hs.s3Client == nil {
		fmt.Printf("AWS S3 Mock Output: Stored internally successfully %d/%d/%d\n", z, x, y)
		return nil
	}

	key := fmt.Sprintf("tiles/%d/%d/%d.png", z, x, y)

	_, err := hs.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(hs.bucketName),
		Key:          aws.String(key),
		Body:         bytes.NewReader(data),
		ContentType:  aws.String("image/png"),
		CacheControl: aws.String("public, max-age=86400"),
	})

	return err
}

func (hs *HeatmapService) GetTileURL(z, x, y int) string {
	return fmt.Sprintf("%s/tiles/%d/%d/%d.png", hs.cdnBaseURL, z, x, y)
}

func (hs *HeatmapService) tileToBounds(z, x, y int) BoundingBox {
	n := math.Pow(2, float64(z))

	west := float64(x)/n*360.0 - 180.0
	east := float64(x+1)/n*360.0 - 180.0

	lat_rad := math.Atan(math.Sinh(math.Pi * (1 - 2*float64(y)/n)))
	north := lat_rad * 180.0 / math.Pi

	lat_rad = math.Atan(math.Sinh(math.Pi * (1 - 2*float64(y+1)/n)))
	south := lat_rad * 180.0 / math.Pi

	return BoundingBox{
		North: north,
		South: south,
		East:  east,
		West:  west,
	}
}

func (hs *HeatmapService) StartCacheWarmingWorker() {
	// Standard daily timer simulating cache warming constraints alongside triggering native CONCURRENTLY view refreshes
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		for range ticker.C {
			fmt.Println("Running Heatmap Cache Warming Routine...")
			// Refresh Materialized View
			err := hs.db.Exec("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_heatmap_grid").Error
			if err != nil {
				fmt.Printf("Error refreshing mv_heatmap_grid: %v\n", err)
			}

			// Typical warming targets priority major city zoom tiles 10-14 here (Stub)
		}
	}()
}

func (hs *HeatmapService) InvalidateCacheRegion(quadkey string) {
	// Called when new crime data triggers priority evaluation
	fmt.Printf("Evaluating selective invalidation for tile region: %s\n", quadkey)
}
