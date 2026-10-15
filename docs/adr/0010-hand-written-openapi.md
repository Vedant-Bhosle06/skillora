# ADR-0010: Hand-written OpenAPI document for the Node API

- **Status:** Accepted
- **Date:** 2026-10-09
- **Deciders:** Member B

## Context

D7 requires OpenAPI documentation for both services. The path service gets it automatically from FastAPI. For the Node API, the first approach was `swagger-jsdoc` comment blocks above each route, which only three endpoints ever received, and which spread long YAML comments through the route files.

## Decision

Maintain one hand-written OpenAPI 3 document, `skillora-api/docs/openapi.js`, covering every `API-N-*` endpoint with shared component schemas, and serve it with `swagger-ui-express` at `/api/docs` (UI) and `/api/docs.json` (raw). `swagger-jsdoc` was removed.

## Alternatives considered

- **`swagger-jsdoc` annotations.** Keeps docs next to code, but clutters routes and was incomplete in practice.
- **Generate the spec from validation schemas (for example zod-to-openapi).** Would require adopting a schema library across all routes.

## Consequences

- ➕ Complete, reviewable API documentation in one place; route files stay short.
- ➖ The document can drift from the code: any change to a route's path, body or responses must update `openapi.js` in the same pull request ([CONTRIBUTING](../../CONTRIBUTING.md)).
