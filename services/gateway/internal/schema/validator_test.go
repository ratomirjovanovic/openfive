package schema

import (
	"testing"
)

func TestValidator_NilSchema_AlwaysValid(t *testing.T) {
	v := NewValidator()
	result := v.Validate(`{"anything": true}`, nil)
	if !result.Valid {
		t.Error("expected valid when schema is nil")
	}
}

func TestValidator_ValidJSON_PassesSimpleSchema(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"name": map[string]interface{}{"type": "string"},
			"age":  map[string]interface{}{"type": "number"},
		},
		"required": []interface{}{"name"},
	}

	result := v.Validate(`{"name": "Alice", "age": 30}`, schema)
	if !result.Valid {
		t.Errorf("expected valid, got errors: %v", result.Errors)
	}
}

func TestValidator_InvalidJSON_Fails(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "object",
	}

	result := v.Validate(`not json at all`, schema)
	if result.Valid {
		t.Error("expected invalid for non-JSON output")
	}
	if len(result.Errors) == 0 {
		t.Error("expected error messages for invalid JSON")
	}
}

func TestValidator_MissingRequiredField_Fails(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"name": map[string]interface{}{"type": "string"},
			"age":  map[string]interface{}{"type": "number"},
		},
		"required": []interface{}{"name", "age"},
	}

	result := v.Validate(`{"name": "Alice"}`, schema)
	if result.Valid {
		t.Error("expected invalid when required field is missing")
	}

	found := false
	for _, e := range result.Errors {
		if e == "missing required field: age" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about missing required field 'age', got: %v", result.Errors)
	}
}

func TestValidator_TypeMismatch_Object(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "object",
	}

	// JSON array instead of object
	result := v.Validate(`[1, 2, 3]`, schema)
	if result.Valid {
		t.Error("expected invalid when type is array but schema expects object")
	}
}

func TestValidator_TypeMismatch_Array(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "array",
	}

	// JSON object instead of array
	result := v.Validate(`{"key": "value"}`, schema)
	if result.Valid {
		t.Error("expected invalid when type is object but schema expects array")
	}
}

func TestValidator_TypeMismatch_String(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "string",
	}

	// Number instead of string
	result := v.Validate(`42`, schema)
	if result.Valid {
		t.Error("expected invalid when type is number but schema expects string")
	}
}

func TestValidator_TypeMismatch_Number(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "number",
	}

	// String instead of number
	result := v.Validate(`"hello"`, schema)
	if result.Valid {
		t.Error("expected invalid when type is string but schema expects number")
	}
}

func TestValidator_TypeMismatch_Boolean(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "boolean",
	}

	// Number instead of boolean
	result := v.Validate(`42`, schema)
	if result.Valid {
		t.Error("expected invalid when type is number but schema expects boolean")
	}
}

func TestValidator_ValidBoolean(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "boolean",
	}

	result := v.Validate(`true`, schema)
	if !result.Valid {
		t.Errorf("expected valid for boolean, got errors: %v", result.Errors)
	}
}

func TestValidator_ValidArray(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "array",
	}

	result := v.Validate(`[1, 2, 3]`, schema)
	if !result.Valid {
		t.Errorf("expected valid for array, got errors: %v", result.Errors)
	}
}

func TestValidator_ValidString(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "string",
	}

	result := v.Validate(`"hello"`, schema)
	if !result.Valid {
		t.Errorf("expected valid for string, got errors: %v", result.Errors)
	}
}

func TestValidator_ValidNumber(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "number",
	}

	result := v.Validate(`3.14`, schema)
	if !result.Valid {
		t.Errorf("expected valid for number, got errors: %v", result.Errors)
	}
}

func TestValidator_NestedObjectValidation(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"address": map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"city": map[string]interface{}{"type": "string"},
				},
				"required": []interface{}{"city"},
			},
		},
		"required": []interface{}{"address"},
	}

	// Missing required nested field
	result := v.Validate(`{"address": {}}`, schema)
	if result.Valid {
		t.Error("expected invalid when nested required field is missing")
	}
}

func TestValidator_NonMapSchema_PassesThrough(t *testing.T) {
	v := NewValidator()
	// schema is not a map[string]interface{}, so validator returns valid
	result := v.Validate(`{"key": "value"}`, "not-a-map-schema")
	if !result.Valid {
		t.Error("expected valid when schema is not a map")
	}
}

func TestValidator_MultipleRequiredFieldsMissing(t *testing.T) {
	v := NewValidator()
	schema := map[string]interface{}{
		"type":       "object",
		"properties": map[string]interface{}{},
		"required":   []interface{}{"name", "age", "email"},
	}

	result := v.Validate(`{}`, schema)
	if result.Valid {
		t.Error("expected invalid when multiple required fields are missing")
	}
	if len(result.Errors) != 3 {
		t.Errorf("expected 3 errors for 3 missing fields, got %d: %v", len(result.Errors), result.Errors)
	}
}
