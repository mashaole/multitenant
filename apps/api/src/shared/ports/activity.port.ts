export const ACTIVITY_EMITTER = Symbol('ACTIVITY_EMITTER');

export interface ActivityPayload {
  orgId: string;
  userId: string;
  group: string;
  action: string;
  metadata: { entityType: string; entityId: string; name: string };
}

export interface IActivityEmitter {
  emit(payload: ActivityPayload): void;
  drain(): Promise<void>;
}
