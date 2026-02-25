package config

import (
	"os"
	"testing"
	"time"
)

func TestLoad_DefaultValues(t *testing.T) {
	// Clear any environment variables that might interfere
	envVars := []string{
		"GATEWAY_PORT",
		"GATEWAY_READ_TIMEOUT_SEC",
		"GATEWAY_WRITE_TIMEOUT_SEC",
		"GATEWAY_SHUTDOWN_TIMEOUT_SEC",
		"DATABASE_URL",
		"SUPABASE_SERVICE_ROLE_KEY",
		"MASTER_ENCRYPTION_KEY",
		"METER_BATCH_SIZE",
		"METER_FLUSH_MS",
		"LOG_LEVEL",
		"LOG_JSON",
	}
	savedVals := make(map[string]string)
	for _, key := range envVars {
		savedVals[key] = os.Getenv(key)
		os.Unsetenv(key)
	}
	defer func() {
		for _, key := range envVars {
			if savedVals[key] != "" {
				os.Setenv(key, savedVals[key])
			}
		}
	}()

	cfg := Load()

	if cfg.Port != 8787 {
		t.Errorf("default Port = %d, want 8787", cfg.Port)
	}
	if cfg.ReadTimeout != 30*time.Second {
		t.Errorf("default ReadTimeout = %v, want 30s", cfg.ReadTimeout)
	}
	if cfg.WriteTimeout != 120*time.Second {
		t.Errorf("default WriteTimeout = %v, want 120s", cfg.WriteTimeout)
	}
	if cfg.ShutdownTimeout != 15*time.Second {
		t.Errorf("default ShutdownTimeout = %v, want 15s", cfg.ShutdownTimeout)
	}
	if cfg.DatabaseURL != "" {
		t.Errorf("default DatabaseURL = %q, want \"\"", cfg.DatabaseURL)
	}
	if cfg.ServiceRoleKey != "" {
		t.Errorf("default ServiceRoleKey = %q, want \"\"", cfg.ServiceRoleKey)
	}
	if cfg.MasterEncKey != "" {
		t.Errorf("default MasterEncKey = %q, want \"\"", cfg.MasterEncKey)
	}
	if cfg.MeterBatchSize != 100 {
		t.Errorf("default MeterBatchSize = %d, want 100", cfg.MeterBatchSize)
	}
	if cfg.MeterFlushMs != 5000 {
		t.Errorf("default MeterFlushMs = %d, want 5000", cfg.MeterFlushMs)
	}
	if cfg.LogLevel != "info" {
		t.Errorf("default LogLevel = %q, want \"info\"", cfg.LogLevel)
	}
	if cfg.LogJSON != true {
		t.Errorf("default LogJSON = %v, want true", cfg.LogJSON)
	}
}

func TestLoad_OverrideWithEnvVars(t *testing.T) {
	os.Setenv("GATEWAY_PORT", "9090")
	os.Setenv("GATEWAY_READ_TIMEOUT_SEC", "60")
	os.Setenv("LOG_LEVEL", "debug")
	os.Setenv("LOG_JSON", "false")
	os.Setenv("METER_BATCH_SIZE", "200")
	defer func() {
		os.Unsetenv("GATEWAY_PORT")
		os.Unsetenv("GATEWAY_READ_TIMEOUT_SEC")
		os.Unsetenv("LOG_LEVEL")
		os.Unsetenv("LOG_JSON")
		os.Unsetenv("METER_BATCH_SIZE")
	}()

	cfg := Load()

	if cfg.Port != 9090 {
		t.Errorf("Port = %d, want 9090", cfg.Port)
	}
	if cfg.ReadTimeout != 60*time.Second {
		t.Errorf("ReadTimeout = %v, want 60s", cfg.ReadTimeout)
	}
	if cfg.LogLevel != "debug" {
		t.Errorf("LogLevel = %q, want \"debug\"", cfg.LogLevel)
	}
	if cfg.LogJSON != false {
		t.Errorf("LogJSON = %v, want false", cfg.LogJSON)
	}
	if cfg.MeterBatchSize != 200 {
		t.Errorf("MeterBatchSize = %d, want 200", cfg.MeterBatchSize)
	}
}

func TestEnvStr_FallbackWhenEmpty(t *testing.T) {
	os.Unsetenv("TEST_ENV_STR")
	got := envStr("TEST_ENV_STR", "fallback")
	if got != "fallback" {
		t.Errorf("envStr returned %q, want \"fallback\"", got)
	}
}

func TestEnvStr_ReturnsEnvValue(t *testing.T) {
	os.Setenv("TEST_ENV_STR", "custom-value")
	defer os.Unsetenv("TEST_ENV_STR")

	got := envStr("TEST_ENV_STR", "fallback")
	if got != "custom-value" {
		t.Errorf("envStr returned %q, want \"custom-value\"", got)
	}
}

func TestEnvInt_FallbackWhenEmpty(t *testing.T) {
	os.Unsetenv("TEST_ENV_INT")
	got := envInt("TEST_ENV_INT", 42)
	if got != 42 {
		t.Errorf("envInt returned %d, want 42", got)
	}
}

func TestEnvInt_ReturnsEnvValue(t *testing.T) {
	os.Setenv("TEST_ENV_INT", "99")
	defer os.Unsetenv("TEST_ENV_INT")

	got := envInt("TEST_ENV_INT", 42)
	if got != 99 {
		t.Errorf("envInt returned %d, want 99", got)
	}
}

func TestEnvInt_FallbackOnInvalidValue(t *testing.T) {
	os.Setenv("TEST_ENV_INT", "not-a-number")
	defer os.Unsetenv("TEST_ENV_INT")

	got := envInt("TEST_ENV_INT", 42)
	if got != 42 {
		t.Errorf("envInt returned %d for invalid value, want fallback 42", got)
	}
}

func TestEnvBool_FallbackWhenEmpty(t *testing.T) {
	os.Unsetenv("TEST_ENV_BOOL")
	got := envBool("TEST_ENV_BOOL", true)
	if got != true {
		t.Errorf("envBool returned %v, want true", got)
	}
}

func TestEnvBool_ReturnsEnvValue(t *testing.T) {
	os.Setenv("TEST_ENV_BOOL", "false")
	defer os.Unsetenv("TEST_ENV_BOOL")

	got := envBool("TEST_ENV_BOOL", true)
	if got != false {
		t.Errorf("envBool returned %v, want false", got)
	}
}

func TestEnvBool_FallbackOnInvalidValue(t *testing.T) {
	os.Setenv("TEST_ENV_BOOL", "not-a-bool")
	defer os.Unsetenv("TEST_ENV_BOOL")

	got := envBool("TEST_ENV_BOOL", true)
	if got != true {
		t.Errorf("envBool returned %v for invalid value, want fallback true", got)
	}
}
