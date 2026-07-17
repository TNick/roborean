# Roborean API app

Thin ASGI entry that wires `roborean-api-fastapi`.

## Run locally

```bash
roborean-api
# or
uvicorn roborean_api_app.main:build --factory --reload --port 8765
```

## Environment

| Variable | Meaning |
|----------|---------|
| `ROBOREAN_STORAGE_BACKEND` | `dict` (default) or `sqlalchemy` |
| `ROBOREAN_STORE_PATH` | Dict store root (default `playground/api-store`) |
| `ROBOREAN_DATABASE_URL` | SQLAlchemy URL when backend is `sqlalchemy` |
| `ROBOREAN_REQUIRE_AUTH` | When true, require `X-Roborean-Principal` |

Auth is a Phase 4 stub only (no JWT).
