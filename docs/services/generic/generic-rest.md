# Generic REST API

Custom HTTP endpoint monitoring.

## Configuration

| Field         | Type   | Required | Description                |
| ------------- | ------ | -------- | -------------------------- |
| URL           | URL    | Yes      | Endpoint URL               |
| Method        | Select | No       | HTTP method (default: GET) |
| Headers       | Text   | No       | Custom headers (JSON)      |
| Response Path | Text   | No       | JSON path to extract value |

## Use Cases

- Monitor any service with a REST API
- Custom health endpoints
- Third-party service status pages

## Widget Displays

- Status based on HTTP response
- Custom value from response body
