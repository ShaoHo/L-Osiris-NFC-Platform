import { PaymentsService } from './payments.service';
import { AccessGrantService } from '../access/access-grant.service';

describe('PaymentsService', () => {
  const prisma = {
    viewerProfile: { findUnique: jest.fn() },
    exhibition: { findUnique: jest.fn() },
    exhibitionVersion: { findUnique: jest.fn() },
  };

  const accessGrantService = {
    issueGrant: jest.fn(),
  } as unknown as AccessGrantService;

  const service = new PaymentsService(
    prisma as any,
    accessGrantService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('issues access grant on checkout session completion', async () => {
    prisma.viewerProfile.findUnique.mockResolvedValue({ id: 'viewer-1' });
    prisma.exhibition.findUnique.mockResolvedValue({ id: 'ex-1' });

    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: {
            viewerId: 'viewer-1',
            exhibitionId: 'ex-1',
            expiresAt: '2030-01-01T00:00:00.000Z',
          },
        },
      },
    };

    await expect(service.handleWebhook(event)).resolves.toEqual({
      received: true,
    });

    expect(accessGrantService.issueGrant).toHaveBeenCalledWith({
      viewerId: 'viewer-1',
      exhibitionId: 'ex-1',
      versionId: null,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });
  });
});
