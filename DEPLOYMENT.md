# 🚀 Deployment Guide: Google Cloud Run

## Build & Deploy Steps
1. Push latest code to GitHub `master` branch.
2. Deploy to Cloud Run using `gcloud`:
```powershell
gcloud run deploy sb-service `
  --source . `
  --region asia-southeast1 `
  --allow-unauthenticated `
  --port 8080 `
  --cpu 1 `
  --memory 1Gi `
  --set-env-vars "DEEPSEEK_API_KEY=sk-...,DEEPSEEK_MODEL=deepseek-chat,OLLAMA_BASE_URL=https://ollama.firekeeper.site,OLLAMA_MODEL=qwen3:4b"
```

## Environment Variables
- `DEEPSEEK_API_KEY`: DeepSeek V3 API key for primary LLM.
- `DEEPSEEK_MODEL`: Model name (default: `deepseek-chat`).
- `OLLAMA_BASE_URL`: Ollama fallback endpoint.
- `DATABASE_URL`: Database connection URL.
