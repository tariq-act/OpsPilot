export class AuditLogDto {
  id!: string;
  organizationId!: string;
  actorUserId!: string | null;
  action!: string;
  entityType!: string;
  entityId!: string;
  metadata!: Record<string, unknown>;
  ipAddress!: string | null;
  userAgent!: string | null;
  createdAt!: Date;
}

export class AuditLogResponseDto {
  auditLog!: AuditLogDto;
}

export class AuditLogListResponseDto {
  auditLogs!: AuditLogDto[];
}
