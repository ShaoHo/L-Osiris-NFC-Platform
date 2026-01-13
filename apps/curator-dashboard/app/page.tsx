import { Card, Grid, Pill, Stack } from '@losiris/design-system';

export default function DashboardPage() {
  return (
    <Stack>
      <Card>
        <h1>Exhibitions Overview</h1>
        <p className="ds-muted">
          Draft, published, and archived exhibitions live here with quick actions for
          creation and publishing.
        </p>
        <Grid columns={2}>
          <Card>
            <h3>Drafts</h3>
            <p className="ds-muted">Create new narratives before you publish.</p>
            <Pill>0 active drafts</Pill>
          </Card>
          <Card>
            <h3>Published</h3>
            <p className="ds-muted">Exhibitions currently visible to viewers.</p>
            <Pill>0 live</Pill>
          </Card>
        </Grid>
      </Card>
      <Card>
        <h2>Next Actions</h2>
        <ul className="ds-muted">
          <li>Start a new exhibition or continue drafting in the AI Studio.</li>
          <li>Review analytics for completion signals.</li>
          <li>Manage your payout details for upcoming drops.</li>
        </ul>
      </Card>
    </Stack>
  );
}
