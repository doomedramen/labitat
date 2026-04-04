# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Labitat seriously. If you discover a security vulnerability, please follow these steps:

1. **Do not** open a public issue on GitHub.
2. Email us at **[security@labitat.example]** (update with actual contact) with:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. We will respond within **72 hours** with an acknowledgment.
4. We aim to resolve critical issues within **7 days** and publish a security advisory.

## Security Details

For full security documentation, see [docs/security.md](docs/security.md).

### Key Security Features

- **AES-256-GCM** encryption for all stored service credentials
- HTTP-only, secure session cookies
- Security headers (HSTS, X-Frame-Options, CSP, etc.)
- Non-root container user
- Minimal attack surface (Alpine-based Docker image)

### What We Expect

- Responsible disclosure
- Reasonable time for us to respond and resolve
- No exploitation of vulnerabilities beyond what's necessary to demonstrate impact

## Security Best Practices for Users

1. Set a strong `SECRET_KEY` (32+ random characters)
2. Use HTTPS in production
3. Keep Labitat updated
4. Back up your database and `SECRET_KEY`

Thank you for helping keep Labitat secure!
