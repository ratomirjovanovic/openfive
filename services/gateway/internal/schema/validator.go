package schema

import (
	"encoding/json"
	"fmt"
)

// Validator validates LLM output against a JSON Schema.
type Validator struct{}

func NewValidator() *Validator {
	return &Validator{}
}

// ValidationResult holds the result of schema validation.
type ValidationResult struct {
	Valid  bool
	Errors []string
}

// Validate checks the output string against a schema definition.
// Uses basic JSON structure validation for MVP.
func (v *Validator) Validate(output string, schema interface{}) *ValidationResult {
	if schema == nil {
		return &ValidationResult{Valid: true}
	}

	// Step 1: Check if output is valid JSON
	var parsed interface{}
	if err := json.Unmarshal([]byte(output), &parsed); err != nil {
		return &ValidationResult{
			Valid:  false,
			Errors: []string{fmt.Sprintf("output is not valid JSON: %v", err)},
		}
	}

	// Step 2: Basic type checking against schema
	schemaMap, ok := schema.(map[string]interface{})
	if !ok {
		return &ValidationResult{Valid: true}
	}

	errors := v.validateObject(parsed, schemaMap)
	return &ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

func (v *Validator) validateObject(data interface{}, schema map[string]interface{}) []string {
	var errors []string

	expectedType, _ := schema["type"].(string)
	properties, _ := schema["properties"].(map[string]interface{})
	required, _ := schema["required"].([]interface{})

	// Check type
	switch expectedType {
	case "object":
		obj, ok := data.(map[string]interface{})
		if !ok {
			errors = append(errors, "expected object type")
			return errors
		}
		// Check required fields
		for _, r := range required {
			field, _ := r.(string)
			if _, exists := obj[field]; !exists {
				errors = append(errors, fmt.Sprintf("missing required field: %s", field))
			}
		}
		// Validate properties
		for key, propSchema := range properties {
			if val, exists := obj[key]; exists {
				propSchemaMap, ok := propSchema.(map[string]interface{})
				if ok {
					subErrors := v.validateObject(val, propSchemaMap)
					errors = append(errors, subErrors...)
				}
			}
		}
	case "array":
		if _, ok := data.([]interface{}); !ok {
			errors = append(errors, "expected array type")
		}
	case "string":
		if _, ok := data.(string); !ok {
			errors = append(errors, "expected string type")
		}
	case "number", "integer":
		if _, ok := data.(float64); !ok {
			errors = append(errors, "expected number type")
		}
	case "boolean":
		if _, ok := data.(bool); !ok {
			errors = append(errors, "expected boolean type")
		}
	}

	return errors
}
