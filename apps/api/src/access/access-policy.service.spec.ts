import { AccessPolicyService } from './access-policy.service';
import { AccessGrantService } from './access-grant.service';

describe('AccessPolicyService', () => {
  const prisma = {
    exhibition: { findUnique: jest.fn() },
    viewerSession: { findUnique: jest.fn() },
  };

  const accessGrantService = {
    findGrantForExhibition: jest.fn(),
  } as unknown as AccessGrantService;

  const service = new AccessPolicyService(
    prisma as any,
    accessGrantService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('denies gallery access when curator NFC scope is locked down', async () => {
    prisma.viewerSession.findUnique.mockResolvedValue({
      nfcTag: {
        curator: { policy: { nfcScopePolicy: 'EXHIBITION_ONLY' } },
      },
    });

    await expect(service.canAccessGallery('session-1')).resolves.toEqual({
      allowed: false,
      reason: 'GOVERNANCE_LOCKED',
    });
  });

  it('requires grant for monetized public exhibition', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-1',
      type: 'ONE_TO_MANY',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      monetizationEnabled: true,
      governanceMaskedAt: null,
      deletedAt: null,
      curatorId: 'cur-1',
    });

    accessGrantService.findGrantForExhibition = jest
      .fn()
      .mockResolvedValue(null);

    await expect(
      service.canAccessExhibition({
        exhibitionId: 'ex-1',
        viewerId: 'viewer-1',
        sessionId: 'session-1',
      }),
    ).resolves.toEqual({
      allowed: false,
      reason: 'GRANT_REQUIRED',
    });
  });

  it('denies access when NFC lockdown restricts other curators', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-2',
      type: 'ONE_TO_ONE',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      monetizationEnabled: false,
      governanceMaskedAt: null,
      deletedAt: null,
      curatorId: 'cur-2',
    });

    prisma.viewerSession.findUnique.mockResolvedValue({
      nfcTag: {
        curatorId: 'cur-1',
        curator: { policy: { nfcScopePolicy: 'EXHIBITION_ONLY' } },
      },
    });

    await expect(
      service.canAccessExhibition({
        exhibitionId: 'ex-2',
        viewerId: 'viewer-1',
        sessionId: 'session-1',
      }),
    ).resolves.toEqual({
      allowed: false,
      reason: 'GOVERNANCE_LOCKED',
    });
  });

  it('denies access when the exhibition is governance masked', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-mask',
      type: 'ONE_TO_ONE',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      monetizationEnabled: false,
      governanceMaskedAt: new Date().toISOString(),
      deletedAt: null,
      curatorId: 'cur-1',
    });

    await expect(
      service.canAccessExhibition({
        exhibitionId: 'ex-mask',
        viewerId: 'viewer-1',
        sessionId: null,
      }),
    ).resolves.toEqual({
      allowed: false,
      reason: 'MASKED',
    });
  });

  it('denies access when the exhibition is deleted', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-deleted',
      type: 'ONE_TO_ONE',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      monetizationEnabled: false,
      governanceMaskedAt: null,
      deletedAt: new Date().toISOString(),
      curatorId: 'cur-1',
    });

    await expect(
      service.canAccessExhibition({
        exhibitionId: 'ex-deleted',
        viewerId: 'viewer-1',
        sessionId: null,
      }),
    ).resolves.toEqual({
      allowed: false,
      reason: 'MASKED',
    });
  });

  it('denies access when the grant has expired', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-expired',
      type: 'ONE_TO_MANY',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      monetizationEnabled: true,
      governanceMaskedAt: null,
      deletedAt: null,
      curatorId: 'cur-1',
    });

    accessGrantService.findGrantForExhibition = jest.fn().mockResolvedValue({
      id: 'grant-1',
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
    });

    await expect(
      service.canAccessExhibition({
        exhibitionId: 'ex-expired',
        viewerId: 'viewer-1',
        sessionId: null,
      }),
    ).resolves.toEqual({
      allowed: false,
      reason: 'GRANT_REQUIRED',
    });
  });

  it('allows access when exhibition is public and active without monetization', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-3',
      type: 'ONE_TO_ONE',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      monetizationEnabled: false,
      governanceMaskedAt: null,
      deletedAt: null,
      curatorId: 'cur-1',
    });

    await expect(
      service.canAccessExhibition({
        exhibitionId: 'ex-3',
        viewerId: null,
        sessionId: null,
      }),
    ).resolves.toEqual({
      allowed: true,
      reason: 'ALLOWED',
    });
  });
});
