# Security Policy

## Supported Versions
Only the latest release (`v0.1.0` and onwards) is currently supported with security updates.

## Reporting a Vulnerability
This project exposes a local/remote interface to your active Antigravity IDE session. Because of its sensitive nature:

- **Security vulnerabilities should preferably be reported privately.** Please use the private vulnerability reporting mechanism available through GitHub (Security tab > Report a vulnerability).
- Do not open a public issue for critical security vulnerabilities.
- **Never include credentials, tokens, or private keys** in public issues or pull requests.

## Best Practices
To ensure your usage of Antigravity Mobile Remote is secure:
1. **Protect your APP_PASSWORD and other secrets.**
2. **Your `.env` file must never be committed.** Make sure it remains securely ignored by Git.
3. Do not expose the server port directly to the public internet without the built-in password protection or a secure external tunneling mechanism.
