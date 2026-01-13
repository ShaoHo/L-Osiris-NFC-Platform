import { AdminActionController } from './admin-action.controller';
import { AdminActionService } from './admin-action.service';
import { ExhibitionAdminController } from './exhibition-admin.controller';

const futureDate = () => new Date(Date.now() + 60_000);
const pastDate = () => new Date(Date.now() - 60_000);

describe('Admin action workflow', () => {
  const prisma = {
    adminAction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    exhibition: {
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
  };

  const accessGrantService = {
    issueGrant: jest.fn(),
    revokeGrant: jest.fn(),
  };

  const adminActionService = new AdminActionService(
    prisma as any,
    accessGrantService as any,
  );

  const adminActionExecutionService = {
    scheduleExecution: jest.fn(),
  };

  const adminActionController = new AdminActionController(
    prisma as any,
    adminActionService as any,
    adminActionExecutionService as any,
  );

  const exhibitionAdminController = new ExhibitionAdminController(prisma as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('runs the force unpublish workflow with audit logs', async () => {
    const executeAfter = futureDate();

    prisma.exhibition.findUnique
      .mockResolvedValueOnce({ id: 'ex-1' })
      .mockResolvedValueOnce({ id: 'ex-1' });
    prisma.adminAction.create.mockResolvedValue({
      id: 'action-1',
      status: 'PENDING',
      requestedBy: 'admin',
      executeAfter,
    });
    prisma.adminAction.findUnique
      .mockResolvedValueOnce({
        id: 'action-1',
        status: 'PENDING',
        requestedBy: 'admin',
        executeAfter,
        payload: {
          type: 'FORCE_UNPUBLISH_EXHIBITION',
          data: { exhibitionId: 'ex-1' },
        },
      })
      .mockResolvedValueOnce({
        id: 'action-1',
        status: 'CONFIRMED',
        requestedBy: 'admin',
        executeAfter: pastDate(),
        payload: {
          type: 'FORCE_UNPUBLISH_EXHIBITION',
          data: { exhibitionId: 'ex-1' },
        },
      });
    prisma.adminAction.update
      .mockResolvedValueOnce({
        id: 'action-1',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        executeAfter,
      })
      .mockResolvedValueOnce({
        id: 'action-1',
        status: 'EXECUTED',
        executedAt: new Date(),
      });
    prisma.exhibition.update.mockResolvedValue({
      id: 'ex-1',
      visibility: 'DRAFT',
      status: 'ARCHIVED',
    });

    await exhibitionAdminController.requestForceUnpublish('ex-1', {
      requestedBy: 'admin',
    });

    await adminActionController.confirm('action-1', {
      confirmedBy: 'approver',
    });

    await adminActionController.execute('action-1', {
      executedBy: 'executor',
    });

    expect(adminActionExecutionService.scheduleExecution).toHaveBeenCalledWith(
      'action-1',
      executeAfter,
    );

    const eventTypes = prisma.auditLog.create.mock.calls.map(
      ([call]) => call.data.eventType,
    );
    expect(eventTypes).toEqual(
      expect.arrayContaining([
        'ADMIN_ACTION_REQUESTED',
        'ADMIN_ACTION_CONFIRMED',
        'ADMIN_ACTION_EXECUTED',
        'EXHIBITION_FORCE_UNPUBLISHED',
      ]),
    );
  });

  it('runs the curator suspension workflow with audit logs', async () => {
    const executeAfter = futureDate();

    prisma.curator.findUnique
      .mockResolvedValueOnce({ id: 'cur-1' })
      .mockResolvedValueOnce({ id: 'cur-1' });
    prisma.adminAction.create.mockResolvedValue({
      id: 'action-2',
      status: 'PENDING',
      requestedBy: 'admin',
      executeAfter,
    });
    prisma.adminAction.findUnique
      .mockResolvedValueOnce({
        id: 'action-2',
        status: 'PENDING',
        requestedBy: 'admin',
        executeAfter,
        payload: {
          type: 'SUSPEND_CURATOR',
          data: { curatorId: 'cur-1', reason: 'policy' },
        },
      })
      .mockResolvedValueOnce({
        id: 'action-2',
        status: 'CONFIRMED',
        requestedBy: 'admin',
        executeAfter: pastDate(),
        payload: {
          type: 'SUSPEND_CURATOR',
          data: { curatorId: 'cur-1', reason: 'policy' },
        },
      });
    prisma.adminAction.update
      .mockResolvedValueOnce({
        id: 'action-2',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        executeAfter,
      })
      .mockResolvedValueOnce({
        id: 'action-2',
        status: 'EXECUTED',
        executedAt: new Date(),
      });
    prisma.curator.update.mockResolvedValue({
      id: 'cur-1',
      suspendedAt: new Date(),
      suspendedReason: 'policy',
      tier: 'STANDARD',
    });

    await exhibitionAdminController.requestSuspendCurator('cur-1', {
      requestedBy: 'admin',
      reason: 'policy',
    });

    await adminActionController.confirm('action-2', {
      confirmedBy: 'approver',
    });

    await adminActionController.execute('action-2', {
      executedBy: 'executor',
    });

    expect(adminActionExecutionService.scheduleExecution).toHaveBeenCalledWith(
      'action-2',
      executeAfter,
    );

    const eventTypes = prisma.auditLog.create.mock.calls.map(
      ([call]) => call.data.eventType,
    );
    expect(eventTypes).toEqual(
      expect.arrayContaining([
        'ADMIN_ACTION_REQUESTED',
        'ADMIN_ACTION_CONFIRMED',
        'ADMIN_ACTION_EXECUTED',
        'CURATOR_SUSPENDED',
      ]),
    );
  });

  it('runs the governance enablement workflow with audit logs', async () => {
    const executeAfter = futureDate();

    prisma.exhibition.findUnique
      .mockResolvedValueOnce({ id: 'ex-2' })
      .mockResolvedValueOnce({ id: 'ex-2' });
    prisma.adminAction.create.mockResolvedValue({
      id: 'action-3',
      status: 'PENDING',
      requestedBy: 'admin',
      executeAfter,
    });
    prisma.adminAction.findUnique
      .mockResolvedValueOnce({
        id: 'action-3',
        status: 'PENDING',
        requestedBy: 'admin',
        executeAfter,
        payload: {
          type: 'ENABLE_GOVERNANCE_POLICY',
          data: { exhibitionId: 'ex-2', reason: 'compliance' },
        },
      })
      .mockResolvedValueOnce({
        id: 'action-3',
        status: 'CONFIRMED',
        requestedBy: 'admin',
        executeAfter: pastDate(),
        payload: {
          type: 'ENABLE_GOVERNANCE_POLICY',
          data: { exhibitionId: 'ex-2', reason: 'compliance' },
        },
      });
    prisma.adminAction.update
      .mockResolvedValueOnce({
        id: 'action-3',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        executeAfter,
      })
      .mockResolvedValueOnce({
        id: 'action-3',
        status: 'EXECUTED',
        executedAt: new Date(),
      });
    prisma.exhibition.update.mockResolvedValue({
      id: 'ex-2',
      governanceMaskedAt: new Date(),
      governanceMaskReason: 'compliance',
    });

    await exhibitionAdminController.requestEnableGovernancePolicy('ex-2', {
      requestedBy: 'admin',
      reason: 'compliance',
    });

    await adminActionController.confirm('action-3', {
      confirmedBy: 'approver',
    });

    await adminActionController.execute('action-3', {
      executedBy: 'executor',
    });

    expect(adminActionExecutionService.scheduleExecution).toHaveBeenCalledWith(
      'action-3',
      executeAfter,
    );

    const eventTypes = prisma.auditLog.create.mock.calls.map(
      ([call]) => call.data.eventType,
    );
    expect(eventTypes).toEqual(
      expect.arrayContaining([
        'ADMIN_ACTION_REQUESTED',
        'ADMIN_ACTION_CONFIRMED',
        'ADMIN_ACTION_EXECUTED',
        'EXHIBITION_GOVERNANCE_ENABLED',
      ]),
    );
  });
});
