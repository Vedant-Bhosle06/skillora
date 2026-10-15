# Contributing to SKILLORA

How the team works on this repository. Setup instructions: [docs/DEV_SETUP.md](docs/DEV_SETUP.md).

## Ownership

| Area | Owner |
|---|---|
| `data/`, `scripts/`, `skillora-path-service/`, D1 and D6 reports | Member A |
| `skillora-api/`, API documentation | Member B |
| `skillora-client/`, user guide | Member C |
| `docs/` (shared documents) | Everyone |

Changes inside another member's area are fine when needed for integration; mention them in the pull request and tell the owner.

## Branches

- `main` is always runnable. Never commit directly to `main` for feature work.
- Branch from the latest `main`: `feat/<member-a|member-b|member-c>/<short-description>`, for example `feat/member-c/progress-tracker`.
- Keep branches short-lived; pull `main` often.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`

| Type | Use for |
|---|---|
| `feat` | New behaviour |
| `fix` | Bug fix |
| `perf` | Performance improvement without behaviour change |
| `refactor` | Code change without behaviour change |
| `test` | Tests only |
| `docs` | Documentation only |
| `chore` | Tooling, dependencies, configuration |

Scopes in use: `api`, `auth`, `users`, `catalog`, `paths`, `admin`, `python`, `data`, `scripts`, `p1`…`p10` (pages), `d1`…`d7` (deliverables), `integration`.

Keep each commit focused on one change and make sure the code still runs after it.

## Pull requests

1. Open a pull request into `main` with a short description of what changed and how it was tested.
2. Another member reviews it.
3. Merge with **"Create a merge commit"**. Do not squash (individual commits are part of the project record) and do not rebase-merge stacked pull requests (it rewrites commits the next pull request depends on).
4. Delete the branch after merging; GitHub then retargets any pull request stacked on it.

## Secrets and configuration

- Never commit `.env` files, database passwords or `INTERNAL_API_KEY`. `.gitignore` excludes `.env`; check `git status` before committing.
- Share secrets only in private messages. If a secret is exposed, rotate it and update every `.env`.
- New configuration variables go into [`.env.example`](.env.example) (with a placeholder value) in the same pull request.

## Documentation

Behaviour changes update the documentation in the same pull request:

| Change | Update |
|---|---|
| Endpoint added or changed | [docs/API.md](docs/API.md) and `skillora-api/docs/openapi.js` |
| Collection or field changed | [docs/DATA_MODEL.md](docs/DATA_MODEL.md) |
| Algorithm changed | [docs/ALGORITHM.md](docs/ALGORITHM.md) |
| Significant design decision | New ADR in [docs/adr/](docs/adr/README.md) |
| Requirement or scope changed | [docs/SRS.md](docs/SRS.md) / [docs/PRD.md](docs/PRD.md) and [docs/CHANGELOG.md](docs/CHANGELOG.md) |

## Testing before a pull request

| Area | Check |
|---|---|
| Path service | `pytest --cov=.` passes with ≥ 80 % coverage |
| Dataset | `node scripts/seed.js --dry-run` passes |
| Node API | Server starts; the changed endpoints behave as documented (Swagger UI at `/api/docs`) |
| Client | The affected pages work against the running API |

The team shares one development database. Clean up test accounts and test data you create (deleting an account removes its sessions and paths).
