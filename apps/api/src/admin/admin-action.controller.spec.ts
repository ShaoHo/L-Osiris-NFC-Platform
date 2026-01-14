import { AdminActionController } from './admin-action.controller';

describe('AdminActionController', () => {
  const prisma = {
    adminAction: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    curator: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    curatorPolicy: {
      upsert: jest.fn(),
    },
    exhibition: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const adminActionService = {
    executeAction: jest.fn(),
  };

  const adminActionExecutionService = {
    scheduleExecution: jest.fn(),
  };

  const auditService = {
    record: jest.fn(),
  };

  const controller = new AdminActionController(
    prisma as any,
    adminActionService as any,
    adminActionExecutionService as any,
    auditService as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('requires confirmedBy to confirm action', async () => {
    prisma.adminAction.findUnique.mockResolvedValue({
      id: 'action-1',
      status: 'PENDING',
      requestedBy: 'admin',
      payload: { type: 'REVOKE_ACCESS_GRANT', data: { grantId: 'grant-1' } },
    });

    await expect(
      controller.confirm('action-1', { confirmedBy: '' }),
    ).rejects.toThrow('confirmedBy is required');
  });

  it('prevents execution before confirmation', async () => {
    prisma.adminAction.findUnique.mockResolvedValue({
      id: 'action-2',
      status: 'PENDING',
      requestedBy: 'admin',
      payload: { type: 'REVOKE_ACCESS_GRANT', data: { grantId: 'grant-1' } },
    });

    await expect(
      controller.execute('action-2', { executedBy: 'admin' }),
    ).rejects.toThrow('Admin action must be confirmed before execution');
  });

  it('executes a confirmed curator policy update', async () => {
    prisma.adminAction.findUnique.mockResolvedValue({
      id: 'action-3',
      status: 'CONFIRMED',
      requestedBy: 'admin',
      payload: {
        type: 'UPDATE_CURATOR_POLICY',
        data: { curatorId: 'cur-1', nfcScopePolicy: 'EXHIBITION_ONLY' },
      },
    });
    prisma.curator.findUnique.mockResolvedValue({ id: 'cur-1' });
    prisma.curatorPolicy.upsert.mockResolvedValue({
      id: 'policy-1',
      curatorId: 'cur-1',
      nfcScopePolicy: 'EXHIBITION_ONLY',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    adminActionService.executeAction.mockResolvedValue({
      action: {
        id: 'action-3',
        status: 'EXECUTED',
      },
      result: { id: 'policy-1' },
    });

    await expect(
      controller.execute('action-3', { executedBy: 'admin' }),
    ).resolves.toMatchObject({ status: 'EXECUTED' });
  });
});
