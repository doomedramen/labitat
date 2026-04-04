name: Service Adapter Request
description: Request support for a new service/widget
title: "service: "
labels: ["service-request"]
body:

- type: markdown
  attributes:
  value: |
  Want support for a new service? Please fill in the details below.
- type: input
  id: service-name
  attributes:
  label: Service Name
  description: The name of the service you'd like supported.
  placeholder: e.g., Jellyfin, Pi-hole, Immich
  validations:
  required: true
- type: input
  id: service-url
  attributes:
  label: Service Website
  description: Link to the service's official website or documentation.
  placeholder: https://...
  validations:
  required: true
- type: input
  id: api-docs
  attributes:
  label: API Documentation
  description: Link to the service's API docs or Swagger/OpenAPI spec.
  placeholder: https://...
  validations:
  required: true
- type: textarea
  id: use-case
  attributes:
  label: What data should the widget display?
  description: Describe what information you'd like the widget to show on the dashboard.
  placeholder: e.g., CPU usage, active streams, blocked queries, etc.
  validations:
  required: true
- type: textarea
  id: auth
  attributes:
  label: Authentication
  description: How does the service authenticate API requests? (API key, username/password, token, etc.)
  validations:
  required: true
- type: textarea
  id: example
  attributes:
  label: Example API Response
  description: If available, paste an example API response (redact sensitive data).
  render: json
  validations:
  required: false
- type: textarea
  id: additional
  attributes:
  label: Additional Context
  description: Any other details that would help implement this adapter.
  validations:
  required: false
