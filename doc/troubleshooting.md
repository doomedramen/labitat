# Troubleshooting

## UniFi Adapter: Self-Signed Certificate Errors

If your UniFi controller uses a self-signed SSL certificate, you may see errors like:

```
Error: self-signed certificate
code: 'DEPTH_ZERO_SELF_SIGNED_CERT'
```

### Solution

Set the following environment variable in your `.env` file:

```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

This tells Node.js to skip TLS certificate validation, allowing connections to servers with self-signed certificates.

### ⚠️ Security Warning

Disabling TLS verification makes your connection vulnerable to man-in-the-middle attacks. Only use this option:

- In trusted/local networks
- When connecting to your own UniFi controller
- When you cannot install a proper SSL certificate

### Alternative: Use a Proper SSL Certificate

For production environments, consider installing a proper SSL certificate on your UniFi controller instead of disabling verification. See the [UniFi documentation](https://help.ui.com/hc/en-us/articles/360015263453) for instructions on installing SSL certificates.
