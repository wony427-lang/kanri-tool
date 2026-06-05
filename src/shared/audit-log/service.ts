import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

import type {
  AuditEvent,
  AuditMetadata,
  ListAuditLogsParams,
  StoredAuditEvent,
} from "./types";

function toStoredAuditEvent(row: {
  id: string;
  kind: string;
  actorStaffAccountId: string | null;
  targetType: string;
  targetId: string | null;
  ip: string | null;
  metadata: unknown;
  createdAt: Date;
}): StoredAuditEvent {
  return {
    id: row.id,
    kind: row.kind as StoredAuditEvent["kind"],
    actorStaffAccountId: row.actorStaffAccountId,
    targetType: row.targetType as StoredAuditEvent["targetType"],
    targetId: row.targetId,
    ip: row.ip,
    metadata: (row.metadata ?? {}) as AuditMetadata,
    createdAt: row.createdAt,
  };
}

export async function writeAuditLog(event: AuditEvent): Promise<void> {
  await prisma.auditLog.create({
    data: {
      kind: event.kind,
      actorStaffAccountId: event.actorStaffAccountId,
      targetType: event.targetType,
      targetId: event.targetId,
      ip: event.ip ?? undefined,
      metadata: event.metadata as Prisma.InputJsonValue,
    },
  });
}

export async function listAuditLogs(
  params: ListAuditLogsParams,
): Promise<{ items: StoredAuditEvent[]; nextCursor: string | null }> {
  const where: Prisma.AuditLogWhereInput = {
    createdAt: {
      gte: params.range.from,
      lte: params.range.to,
    },
    ...(params.kinds?.length ? { kind: { in: [...params.kinds] } } : {}),
    ...(params.actorStaffAccountId
      ? { actorStaffAccountId: params.actorStaffAccountId }
      : {}),
    ...(params.targetId ? { targetId: params.targetId } : {}),
  };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: params.limit + 1,
    ...(params.cursor
      ? {
          cursor: { id: params.cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;

  return {
    items: items.map(toStoredAuditEvent),
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
  };
}
