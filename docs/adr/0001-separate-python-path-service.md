# ADR-0001: Separate Python service for path computation

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Members A, B, C

## Context

The core of SKILLORA is a graph algorithm (A\* over sets of skills, plus graph utilities: ancestors, topological sort, cycle detection). It must be correct, demonstrable on its own, and unit-tested to at least 80 % coverage (D3). The rest of the product is a conventional MERN web application.

## Decision

Implement path computation as a separate **Python / FastAPI / NetworkX** service (`skillora-path-service`). It is stateless, reads `skills` and `skill_edges` read-only, and is called only by the Node API. The Node API remains the single public API and the only writer to the database.

## Alternatives considered

- **Implement the algorithm inside the Node API.** Keeps one runtime and a pure MERN stack, but JavaScript lacks a mature graph library comparable to NetworkX, and the algorithm would be harder to test and demonstrate in isolation.
- **Let the browser or Python service talk to the database directly for everything.** Splits ownership of writes and business rules across services; rejected.

## Consequences

- ➕ The algorithm can be tested with fixture graphs and called with `curl`, independent of the web app and of any user session (FR-15).
- ➕ Computation can be scaled or replaced independently later (task queue, workers).
- ➖ Two runtimes to install, configure and deploy; a shared secret between services ([ADR-0007](0007-internal-api-key.md)); a network hop with its own timeout and failure handling.
- ➖ The course is MERN-focused: the use of Python must be justified to faculty (recorded as a risk in the [PRD](../PRD.md#10-risks)). If it is not accepted, the same algorithm can be ported to Node.js behind the same `/compute/paths` contract.
