package main

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/redis/go-redis/v9"
)

// =============================================================================
// Job Implementations
// All jobs are idempotent and safe to re-run at any time.
// =============================================================================

// ---  1. RefreshHeatmapView --------------------------------------------------

func (j *JobRunner) RefreshHeatmapView() {
	j.log.Info("Refreshing mv_heatmap_grid...")
	start := time.Now()

	// CONCURRENTLY allows reads to continue during refresh
	if err := j.db.Exec(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_heatmap_grid`).Error; err != nil {
		j.log.Errorw("Failed to refresh heatmap view", "error", err)
		return
	}

	j.log.Infow("Heatmap view refreshed", "duration_ms", time.Since(start).Milliseconds())
}

// --- 2. UpdateDangerZones ----------------------------------------------------

func (j *JobRunner) UpdateDangerZones() {
	j.log.Info("Updating danger zones from recent crime data...")

	// 1. Expire stale zones
	del := j.db.Exec(`DELETE FROM danger_zones WHERE valid_until < NOW()`)
	j.log.Infow("Expired stale danger zones", "rows_deleted", del.RowsAffected)

	// 2. Recalculate from 30-day crime window
	query := `
		INSERT INTO danger_zones (id, boundary, risk_level, crime_count, severity_sum, density_score, calculated_at, valid_until)
		SELECT
			gen_random_uuid(),
			ST_MakeEnvelope(
				grid_x * 0.01, grid_y * 0.01,
				(grid_x + 1) * 0.01, (grid_y + 1) * 0.01,
				4326
			)::geography,
			CASE
				WHEN crime_count >= 50 THEN 'critical'
				WHEN crime_count >= 20 THEN 'high'
				WHEN crime_count >= 10 THEN 'medium'
				ELSE 'low'
			END,
			crime_count,
			severity_sum,
			(crime_count::FLOAT * avg_severity / 4.0 * 25.0),
			NOW(),
			NOW() + INTERVAL '24 hours'
		FROM (
			SELECT
				FLOOR(ST_X(location::geometry) / 0.01)::INT as grid_x,
				FLOOR(ST_Y(location::geometry) / 0.01)::INT as grid_y,
				COUNT(*)::INT as crime_count,
				SUM(severity)::INT as severity_sum,
				AVG(severity)::FLOAT as avg_severity
			FROM crime_incidents
			WHERE occurred_at > NOW() - INTERVAL '30 days'
			  AND verified = true
			GROUP BY grid_x, grid_y
			HAVING COUNT(*) >= 3
		) t
	`

	res := j.db.Exec(query)
	if res.Error != nil {
		j.log.Errorw("UpdateDangerZones failed", "error", res.Error)
		return
	}
	j.log.Infow("Danger zones upserted", "rows_inserted", res.RowsAffected)
}

// --- 3. CleanOldLocations ----------------------------------------------------

func (j *JobRunner) CleanOldLocations() {
	j.log.Info("Deleting location data older than 90 days...")

	res := j.db.Exec(`DELETE FROM user_locations WHERE recorded_at < NOW() - INTERVAL '90 days'`)
	if res.Error != nil {
		j.log.Errorw("CleanOldLocations failed", "error", res.Error)
		return
	}
	j.log.Infow("Old locations removed", "rows_deleted", res.RowsAffected)

	// VACUUM ANALYZE to reclaim disk space and update planner stats
	j.db.Exec(`VACUUM ANALYZE user_locations`)
}

// --- 4. CleanOldNotifications ------------------------------------------------

func (j *JobRunner) CleanOldNotifications() {
	j.log.Info("Deleting notifications older than 30 days...")

	res := j.db.Exec(`DELETE FROM notification_logs WHERE sent_at < NOW() - INTERVAL '30 days'`)
	if res.Error != nil {
		j.log.Errorw("CleanOldNotifications failed", "error", res.Error)
		return
	}
	j.log.Infow("Old notifications removed", "rows_deleted", res.RowsAffected)
}

// --- 5. GenerateDailyReport --------------------------------------------------

func (j *JobRunner) GenerateDailyReport() {
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	j.log.Infow("Generating daily analytics report", "date", yesterday)

	var stats struct {
		NewUsers       int64
		AlertsCreated  int64
		AlertsResolved int64
		AvgResponseSec float64
	}

	j.db.Model(&models.User{}).
		Where("DATE(created_at) = ?", yesterday).
		Count(&stats.NewUsers)

	j.db.Model(&models.EmergencyAlert{}).
		Where("DATE(created_at) = ?", yesterday).
		Count(&stats.AlertsCreated)

	j.db.Model(&models.EmergencyAlert{}).
		Where("DATE(resolved_at) = ?", yesterday).
		Count(&stats.AlertsResolved)

	j.db.Raw(`
		SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (ar.responded_at - ea.created_at))), 0)
		FROM alert_responses ar
		JOIN emergency_alerts ea ON ar.alert_id = ea.id
		WHERE DATE(ar.responded_at) = ?
	`, yesterday).Scan(&stats.AvgResponseSec)

	j.log.Infow("Daily report",
		"date", yesterday,
		"new_users", stats.NewUsers,
		"alerts_created", stats.AlertsCreated,
		"alerts_resolved", stats.AlertsResolved,
		"avg_response_sec", fmt.Sprintf("%.0f", stats.AvgResponseSec),
	)

	// Cache report in Redis with 7-day TTL
	reportKey := fmt.Sprintf("analytics:daily:%s", yesterday)
	reportData := fmt.Sprintf(
		`{"date":"%s","new_users":%d,"alerts_created":%d,"alerts_resolved":%d,"avg_response_sec":%.0f}`,
		yesterday, stats.NewUsers, stats.AlertsCreated, stats.AlertsResolved, stats.AvgResponseSec,
	)
	j.redis.Set(context.Background(), reportKey, reportData, 7*24*time.Hour)
}

// --- 6. PrewarmTileCache -----------------------------------------------------

func (j *JobRunner) PrewarmTileCache() {
	j.log.Info("Pre-warming heatmap tile cache for major city bounding boxes...")

	// Representative zoom 10-12 tile ranges for Delhi/NCR region
	cities := []struct {
		Name string
		Lat  float64
		Lng  float64
	}{
		{"Delhi NCR", 28.6139, 77.2090},
		{"Mumbai", 19.0760, 72.8777},
		{"Bangalore", 12.9716, 77.5946},
		{"Hyderabad", 17.3850, 78.4867},
		{"Chennai", 13.0827, 80.2707},
	}

	count := 0
	for _, city := range cities {
		for z := 10; z <= 13; z++ {
			x, y := latLngToTileXY(city.Lat, city.Lng, z)
			// Pre-fetch 3x3 grid around the tile center
			for dx := -1; dx <= 1; dx++ {
				for dy := -1; dy <= 1; dy++ {
					cacheKey := fmt.Sprintf("heatmap:tile:%d:%d:%d", z, x+dx, y+dy)
					// Only warm if not already cached
					exists := j.redis.Exists(context.Background(), cacheKey).Val()
					if exists == 0 {
						// Signal the heatmap service to generate this tile
						j.redis.RPush(context.Background(), "heatmap:prewarm:queue",
							fmt.Sprintf("%d/%d/%d", z, x+dx, y+dy))
					}
					count++
				}
			}
		}
	}
	j.log.Infow("Tile cache warm jobs queued", "tiles_checked", count)
}

// latLngToTileXY converts lat/lng to slippy map tile coordinates at zoom z.
func latLngToTileXY(lat, lng float64, z int) (int, int) {
	nTiles := math.Pow(2, float64(z))
	x := int((lng + 180.0) / 360.0 * nTiles)
	latRad := lat * math.Pi / 180.0
	y := int((1.0 - math.Log(math.Tan(latRad)+1.0/math.Cos(latRad))/math.Pi) / 2.0 * nTiles)
	return x, y
}

// --- 7. SendDailySafetyDigest ------------------------------------------------

func (j *JobRunner) SendDailySafetyDigest() {
	j.log.Info("Sending daily safety digests...")

	var users []models.User
	j.db.Where("email_verified = ? AND account_status = ?", true, "active").
		Select("id, name, email, phone").
		Find(&users)

	// In production: iterate, generate personalised digest, send via SES/SendGrid
	// For now: queue digest jobs in Redis stream
	ctx := context.Background()
	for _, u := range users {
		j.redis.XAdd(ctx, &redis.XAddArgs{
			Stream: "digest:jobs",
			Values: map[string]interface{}{"user_id": u.ID},
		})
	}
	j.log.Infow("Safety digest jobs queued", "user_count", len(users))
}

// --- 8. ExpireInactiveSessions -----------------------------------------------

func (j *JobRunner) ExpireInactiveSessions() {
	j.log.Info("Expiring timed-out sessions...")

	res := j.db.Model(&models.UserSession{}).
		Where("expires_at < ? AND is_revoked = ?", time.Now(), false).
		Update("is_revoked", true)

	if res.Error != nil {
		j.log.Errorw("ExpireInactiveSessions failed", "error", res.Error)
		return
	}
	j.log.Infow("Sessions expired", "rows_updated", res.RowsAffected)
}

// --- 9. UpdateTrustScores ----------------------------------------------------

func (j *JobRunner) UpdateTrustScores() {
	j.log.Info("Recalculating user trust scores...")

	query := `
		UPDATE users u
		SET trust_score = LEAST(100, GREATEST(0,
			50
			+ (SELECT COUNT(*) * 5  FROM alert_responses WHERE responder_user_id = u.id AND response_status = 'arrived')
			+ (SELECT COUNT(*) * 10 FROM alert_responses WHERE responder_user_id = u.id AND response_rating >= 4)
			- (SELECT COUNT(*) * 10 FROM alert_responses WHERE responder_user_id = u.id AND response_status = 'declined')
		))
	`

	res := j.db.Exec(query)
	if res.Error != nil {
		j.log.Errorw("UpdateTrustScores failed", "error", res.Error)
		return
	}
	j.log.Infow("Trust scores updated", "rows_affected", res.RowsAffected)
}

// --- 10. ArchiveOldAlerts ----------------------------------------------------

func (j *JobRunner) ArchiveOldAlerts() {
	j.log.Info("Archiving alerts older than 6 months...")

	cutoff := time.Now().AddDate(0, -6, 0)

	// Soft-delete resolved alerts beyond retention window
	res := j.db.
		Where("alert_status IN ? AND created_at < ?", []string{"resolved", "cancelled"}, cutoff).
		Delete(&models.EmergencyAlert{})

	if res.Error != nil {
		j.log.Errorw("ArchiveOldAlerts failed", "error", res.Error)
		return
	}
	j.log.Infow("Old alerts archived", "rows_soft_deleted", res.RowsAffected)
}
