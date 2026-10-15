# ADR-0009: Word-prefix regex search instead of a text index

- **Status:** Accepted
- **Date:** 2026-10-09
- **Deciders:** Member B

## Context

The skill picker (P3) needs typeahead: typing `pyt` should suggest Python. The original design used a MongoDB `$text` index on `name` and `aliases`, but `$text` matches whole (stemmed) words only, so partial input returns nothing.

## Decision

`GET /api/skills?search=` runs a case-insensitive regular expression `(^|\s)<escaped input>` against `name` and `aliases`: it matches the start of any word. Input is regex-escaped, results are sorted by name and limited to 20. Without `search`, all skills are returned. The text index was removed.

## Alternatives considered

- **`$text` index.** No prefix matching, as above.
- **Atlas Search (autocomplete index).** Best relevance, but tied to Atlas-specific configuration and unnecessary for about 120 documents.
- **Client-side filtering only.** Possible for a small catalog, but the API should support search for any client.

## Consequences

- ➕ Correct typeahead behaviour with no extra infrastructure.
- ➖ Regex queries cannot use an index efficiently; acceptable for a catalog of this size, to be revisited if it grows into thousands of skills.
