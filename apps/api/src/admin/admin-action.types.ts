export interface IssueAccessGrantPayload {
  type: 'ISSUE_ACCESS_GRANT';
  data: {
    viewerId: string;
    exhibitionId?: string | null;
    versionId?: string | null;
    expiresAt?: string | null;
  };
}

export interface RevokeAccessGrantPayload {
  type: 'REVOKE_ACCESS_GRANT';
  data: {
    grantId: string;
  };
}

export interface UpdateCuratorPolicyPayload {
  type: 'UPDATE_CURATOR_POLICY';
  data: {
    curatorId: string;
    nfcScopePolicy: 'EXHIBITION_ONLY' | 'EXHIBITION_AND_GALLERY';
  };
}

export interface ForceUnpublishPayload {
  type: 'FORCE_UNPUBLISH_EXHIBITION';
  data: {
    exhibitionId: string;
  };
}

export interface SuspendCuratorPayload {
  type: 'SUSPEND_CURATOR';
  data: {
    curatorId: string;
    reason?: string | null;
  };
}

export interface EnableGovernancePolicyPayload {
  type: 'ENABLE_GOVERNANCE_POLICY';
  data: {
    exhibitionId: string;
    reason?: string | null;
  };
}

export interface UnsuspendCuratorPayload {
  type: 'UNSUSPEND_CURATOR';
  data: {
    curatorId: string;
  };
}

export interface TransferExhibitionOwnershipPayload {
  type: 'TRANSFER_EXHIBITION_OWNERSHIP';
  data: {
    exhibitionId: string;
    fromCuratorId?: string | null;
    toCuratorId: string;
    reason?: string | null;
  };
}

export type AdminActionPayload =
  | IssueAccessGrantPayload
  | RevokeAccessGrantPayload
  | UpdateCuratorPolicyPayload
  | ForceUnpublishPayload
  | SuspendCuratorPayload
  | EnableGovernancePolicyPayload
  | UnsuspendCuratorPayload
  | TransferExhibitionOwnershipPayload;
