import { Card, Stack } from '@losiris/design-system';

export default function SuperAdminHome() {
  return (
    <Stack>
      <Card>
        <h1>Super Admin Portal</h1>
        <p className="ds-muted">
          Governance controls for curator access, NFC inventory, and policy enforcement.
        </p>
      </Card>
      <Card>
        <h2>Access Gate</h2>
        <ul className="ds-muted">
          <li>VPN-only access enforced by IP allowlist.</li>
          <li>OTP required on every action.</li>
          <li>All actions logged to audit trail.</li>
        </ul>
      </Card>
    </Stack>
  );
}
