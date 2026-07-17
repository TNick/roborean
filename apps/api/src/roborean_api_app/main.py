"""ASGI entry."""

import uvicorn
from roborean_api_fastapi import create_app


def build():
    """Factory for uvicorn."""
    return create_app()


def main() -> None:
    """Run the API with uvicorn."""
    uvicorn.run(
        "roborean_api_app.main:build",
        factory=True,
        host="0.0.0.0",
        port=8000,
        reload=True,
    )


if __name__ == "__main__":
    main()
