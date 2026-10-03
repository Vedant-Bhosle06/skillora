# skillora-path-service

Python / FastAPI algorithm microservice — `/compute/paths`, `/graph/*`, `/health`.

**Owner:** Member A

See [`../docs/SKILLORA_Team_Work_Division.md`](../docs/SKILLORA_Team_Work_Division.md) for the full algorithm spec and endpoint details.

## Setup

```bash
pip install -r requirements.txt
cp ../.env.example .env   # then fill in your values
uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

## Tests

```bash
pytest tests/ -v --cov=. --cov-report=term-missing
```

> Tests use in-memory fixture graphs — MongoDB does NOT need to be running.
