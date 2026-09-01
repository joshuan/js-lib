# @joshuan/observability

Request logging follows an allow-list model: route-shaped URLs and selected request/response headers
are retained; query strings, path identifiers, cookies, authorization, locations and set-cookie are
dropped by omission.

The request correlation context is also usable by background jobs and outgoing HTTP adapters.
