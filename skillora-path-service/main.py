"""FastAPI entry point for the Skillora path-computation service."""
import secrets
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request

import config


def create_app(api_key: Optional[str] = None) -> FastAPI:
    key = api_key if api_key is not None else config.internal_api_key()
    if not key:
        raise RuntimeError("INTERNAL_API_KEY is not set; refusing to start")

    app = FastAPI(title="Skillora Path Service")
    app.state.api_key = key

    def require_key(request: Request, x_internal_key: Optional[str] = Header(default=None)) -> None:
        """Shared-secret check applied to every route except /health."""
        expected = request.app.state.api_key
        if not x_internal_key or not secrets.compare_digest(x_internal_key, expected):
            raise HTTPException(status_code=403, detail="Forbidden")

    app.state.require_key = require_key

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "graphLoaded": False, "nodes": 0, "edges": 0}

    return app


def _default_app() -> FastAPI:
    return create_app()


app = _default_app()
