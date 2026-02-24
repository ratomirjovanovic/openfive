package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port            int
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
	DatabaseURL     string
	ServiceRoleKey  string
	MasterEncKey    string
	MeterBatchSize  int
	MeterFlushMs    int
	LogLevel        string
	LogJSON         bool
}

func Load() *Config {
	return &Config{
		Port:            envInt("GATEWAY_PORT", 8787),
		ReadTimeout:     time.Duration(envInt("GATEWAY_READ_TIMEOUT_SEC", 30)) * time.Second,
		WriteTimeout:    time.Duration(envInt("GATEWAY_WRITE_TIMEOUT_SEC", 120)) * time.Second,
		ShutdownTimeout: time.Duration(envInt("GATEWAY_SHUTDOWN_TIMEOUT_SEC", 15)) * time.Second,
		DatabaseURL:     envStr("DATABASE_URL", ""),
		ServiceRoleKey:  envStr("SUPABASE_SERVICE_ROLE_KEY", ""),
		MasterEncKey:    envStr("MASTER_ENCRYPTION_KEY", ""),
		MeterBatchSize:  envInt("METER_BATCH_SIZE", 100),
		MeterFlushMs:    envInt("METER_FLUSH_MS", 5000),
		LogLevel:        envStr("LOG_LEVEL", "info"),
		LogJSON:         envBool("LOG_JSON", true),
	}
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}
