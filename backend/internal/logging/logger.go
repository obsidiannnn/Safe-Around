package logging

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/sirupsen/logrus"
)

// Global logger instance — call InitLogger once at startup.
var log *logrus.Logger

// InitLogger configures the global logger.
// env: "development" | "production"
func InitLogger(env string) {
	log = logrus.New()
	log.SetOutput(os.Stdout)

	if env == "production" {
		log.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: time.RFC3339Nano,
			FieldMap: logrus.FieldMap{
				logrus.FieldKeyTime:  "@timestamp",
				logrus.FieldKeyLevel: "level",
				logrus.FieldKeyMsg:   "message",
			},
		})
		log.SetLevel(logrus.InfoLevel)

		// Wire Elasticsearch hook
		esURL := os.Getenv("ELASTICSEARCH_URL")
		if esURL != "" {
			esClient, err := elasticsearch.NewClient(elasticsearch.Config{
				Addresses: []string{esURL},
			})
			if err == nil {
				log.AddHook(NewElasticsearchHook(esClient, "safearound-logs"))
				log.Info("Elasticsearch log hook registered")
			} else {
				log.WithError(err).Warn("Failed to connect Elasticsearch log hook")
			}
		}
	} else {
		log.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: "15:04:05.000",
			ForceColors:     true,
		})
		log.SetLevel(logrus.DebugLevel)
	}
}

// --- Public helpers ---

func Info(msg string, fields logrus.Fields) {
	ensureInit()
	log.WithFields(fields).Info(msg)
}

func Error(msg string, err error, fields logrus.Fields) {
	ensureInit()
	if fields == nil {
		fields = logrus.Fields{}
	}
	if err != nil {
		fields["error"] = err.Error()
	}
	log.WithFields(fields).Error(msg)
}

func Debug(msg string, fields logrus.Fields) {
	ensureInit()
	log.WithFields(fields).Debug(msg)
}

func Warn(msg string, fields logrus.Fields) {
	ensureInit()
	log.WithFields(fields).Warn(msg)
}

func WithField(key string, value interface{}) *logrus.Entry {
	ensureInit()
	return log.WithField(key, value)
}

// ensureInit bootstraps a default development logger if InitLogger was never called.
func ensureInit() {
	if log == nil {
		InitLogger("development")
	}
}

// =============================================================================
// Elasticsearch Hook
// =============================================================================

// ElasticsearchHook sends logrus entries to an Elasticsearch index.
type ElasticsearchHook struct {
	client    *elasticsearch.Client
	indexBase string // e.g. "safearound-logs"  → final: safearound-logs-2024.03.20
}

func NewElasticsearchHook(client *elasticsearch.Client, indexBase string) *ElasticsearchHook {
	return &ElasticsearchHook{client: client, indexBase: indexBase}
}

// Levels returns all levels so every log entry is shipped to Elasticsearch.
func (h *ElasticsearchHook) Levels() []logrus.Level {
	return logrus.AllLevels
}

// Fire encodes the log entry as JSON and indexes it into Elasticsearch. Non-blocking.
func (h *ElasticsearchHook) Fire(entry *logrus.Entry) error {
	// Build daily rolling index name: safearound-logs-2024.03.20
	index := fmt.Sprintf("%s-%s", h.indexBase, time.Now().UTC().Format("2006.01.02"))

	doc := map[string]interface{}{
		"@timestamp": entry.Time.UTC().Format(time.RFC3339Nano),
		"level":      entry.Level.String(),
		"message":    entry.Message,
		"service":    "safearound-api",
	}
	for k, v := range entry.Data {
		doc[k] = v
	}

	body, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	// Async to avoid blocking the request path
	go func() {
		res, err := h.client.Index(
			index,
			strings.NewReader(string(body)),
			h.client.Index.WithContext(context.Background()),
			h.client.Index.WithRefresh("false"),
		)
		if err == nil && res != nil {
			var buf bytes.Buffer
			buf.ReadFrom(res.Body)
			res.Body.Close()
		}
	}()

	return nil
}
