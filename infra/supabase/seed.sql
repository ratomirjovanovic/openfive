-- OpenFive Seed Data
-- Default models catalog (prices as of early 2026, update as needed)
-- These are "system" providers (organization_id = NULL) available to all orgs

-- Note: In production, users create their own provider records with their own API keys.
-- This seed data provides reference pricing and capability data for the model catalog.

-- System-level OpenRouter provider reference (no API key - users add their own)
INSERT INTO providers (id, organization_id, name, display_name, provider_type, base_url, status) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'openrouter', 'OpenRouter', 'openrouter', 'https://openrouter.ai/api/v1', 'active'),
  ('00000000-0000-0000-0000-000000000002', NULL, 'ollama', 'Ollama (Local)', 'ollama', 'http://localhost:11434/v1', 'active')
ON CONFLICT DO NOTHING;

-- Popular models via OpenRouter
INSERT INTO models (provider_id, model_id, display_name, context_window, max_output_tokens, input_price_per_m, output_price_per_m, supports_streaming, supports_tools, supports_vision, supports_json_mode, reliability_pct) VALUES
  -- Anthropic
  ('00000000-0000-0000-0000-000000000001', 'anthropic/claude-sonnet-4', 'Claude Sonnet 4', 200000, 8192, 3.0, 15.0, true, true, true, true, 99.5),
  ('00000000-0000-0000-0000-000000000001', 'anthropic/claude-haiku-3.5', 'Claude Haiku 3.5', 200000, 8192, 0.80, 4.0, true, true, true, true, 99.5),
  ('00000000-0000-0000-0000-000000000001', 'anthropic/claude-opus-4', 'Claude Opus 4', 200000, 32000, 15.0, 75.0, true, true, true, true, 99.0),
  -- OpenAI
  ('00000000-0000-0000-0000-000000000001', 'openai/gpt-4o', 'GPT-4o', 128000, 16384, 2.5, 10.0, true, true, true, true, 99.0),
  ('00000000-0000-0000-0000-000000000001', 'openai/gpt-4o-mini', 'GPT-4o Mini', 128000, 16384, 0.15, 0.60, true, true, true, true, 99.0),
  ('00000000-0000-0000-0000-000000000001', 'openai/o1', 'o1', 200000, 100000, 15.0, 60.0, true, true, true, true, 98.0),
  ('00000000-0000-0000-0000-000000000001', 'openai/o3-mini', 'o3-mini', 200000, 100000, 1.10, 4.40, true, true, false, true, 98.0),
  -- Google
  ('00000000-0000-0000-0000-000000000001', 'google/gemini-2.0-flash', 'Gemini 2.0 Flash', 1000000, 8192, 0.10, 0.40, true, true, true, true, 98.0),
  ('00000000-0000-0000-0000-000000000001', 'google/gemini-2.5-pro', 'Gemini 2.5 Pro', 1000000, 65536, 1.25, 10.0, true, true, true, true, 97.0),
  -- Meta
  ('00000000-0000-0000-0000-000000000001', 'meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B', 131072, 4096, 0.39, 0.39, true, true, false, true, 97.0),
  -- Mistral
  ('00000000-0000-0000-0000-000000000001', 'mistralai/mistral-large', 'Mistral Large', 128000, 4096, 2.0, 6.0, true, true, false, true, 98.0),
  ('00000000-0000-0000-0000-000000000001', 'mistralai/mistral-small', 'Mistral Small', 32000, 4096, 0.10, 0.30, true, true, false, true, 98.0),
  -- DeepSeek
  ('00000000-0000-0000-0000-000000000001', 'deepseek/deepseek-chat-v3', 'DeepSeek V3', 64000, 8192, 0.27, 1.10, true, true, false, true, 95.0)
ON CONFLICT DO NOTHING;

-- Popular Ollama models (no pricing - local inference)
INSERT INTO models (provider_id, model_id, display_name, context_window, max_output_tokens, input_price_per_m, output_price_per_m, supports_streaming, supports_tools, supports_vision, supports_json_mode, reliability_pct) VALUES
  ('00000000-0000-0000-0000-000000000002', 'llama3.2', 'Llama 3.2 (Local)', 131072, 4096, 0, 0, true, false, false, true, 95.0),
  ('00000000-0000-0000-0000-000000000002', 'llama3.2:1b', 'Llama 3.2 1B (Local)', 131072, 4096, 0, 0, true, false, false, true, 95.0),
  ('00000000-0000-0000-0000-000000000002', 'mistral', 'Mistral 7B (Local)', 32000, 4096, 0, 0, true, false, false, true, 95.0),
  ('00000000-0000-0000-0000-000000000002', 'qwen2.5', 'Qwen 2.5 (Local)', 32000, 4096, 0, 0, true, false, false, true, 95.0),
  ('00000000-0000-0000-0000-000000000002', 'phi3', 'Phi-3 (Local)', 128000, 4096, 0, 0, true, false, false, true, 95.0)
ON CONFLICT DO NOTHING;
