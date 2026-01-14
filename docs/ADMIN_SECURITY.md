# Admin API Security

The admin API endpoints (`/v1/admin/**`) require multiple layers of protection.

## Guarding model

Admin routes now require:

1. **Basic auth + role check**
   - The admin credentials are supplied via HTTP basic auth.
   - The authenticated user must carry the `ADMIN` role.

2. **IP allowlist**
   - `ADMIN_IP_ALLOWLIST_CIDRS` is a comma-separated list of IP addresses or CIDR ranges.
   - If unset, access is limited to `127.0.0.1/32` and `::1/128`.
   - The first value from `x-forwarded-for` is used when present.

3. **OTP verification**
   - Supply an `x-admin-otp` header with every admin request.
   - `ADMIN_OTP_SECRETS` is a comma-separated list of shared secrets (Base32 or raw text).
   - OTP codes are TOTP (6 digits) using 30-second steps with a ±1 step window by default.
   - Customize with `ADMIN_TOTP_STEP_SECONDS` and `ADMIN_TOTP_WINDOW` if needed.

Audit logs are written for authentication attempts, IP denials, and OTP validation events.

## Admin session endpoint

`POST /v1/admin/session` validates credentials + OTP and records an audit entry for
session creation. `GET /v1/admin/session` returns the current admin identity when the
same auth headers are supplied.
