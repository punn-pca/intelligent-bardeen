import { prisma } from './db';
import crypto from 'crypto';

export interface AuditLogOptions {
  userId?: string;
  username: string;
  action: string;
  entity: string;
  entityId?: string;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
}

export async function createAuditLog(options: AuditLogOptions, txClient?: any) {
  const client = txClient || prisma;
  try {
    const beforeStr = typeof options.beforeData === 'string' ? options.beforeData : options.beforeData ? JSON.stringify(options.beforeData) : '';
    const afterStr = typeof options.afterData === 'string' ? options.afterData : options.afterData ? JSON.stringify(options.afterData) : '';
    
    // Fetch last audit log to build SHA-256 cryptographic chain
    const lastLog = await client.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    });

    const previousHash = lastLog?.hash || 'GENESIS_HASH_00000000000000000000000000000000';
    const timestamp = new Date().toISOString();

    const dataToHash = `${previousHash}|${options.userId || ''}|${options.username}|${options.action}|${options.entity}|${options.entityId || ''}|${beforeStr}|${afterStr}|${timestamp}`;
    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    return await client.auditLog.create({
      data: {
        userId: options.userId,
        username: options.username,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        beforeData: beforeStr || null,
        afterData: afterStr || null,
        ipAddress: options.ipAddress || '127.0.0.1',
        previousHash,
        hash,
      },
    });
  } catch (error) {
    console.error('Failed to create cryptographic audit log:', error);
  }
}

export const recordAuditLog = createAuditLog;
