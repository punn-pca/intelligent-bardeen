import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const approvals = await prisma.approvalWorkflow.findMany({
      include: {
        document: true,
        requester: true,
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(approvals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch approvals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { approvalId, status, approverId, reason } = body;

    const approval = await prisma.approvalWorkflow.update({
      where: { id: approvalId },
      data: {
        status,
        approvedBy: approverId || 'usr-admin',
        reason,
        updatedAt: new Date(),
      },
      include: { document: true },
    });

    if (status === 'APPROVED' && approval.documentId) {
      await prisma.document.update({
        where: { id: approval.documentId },
        data: { status: 'APPROVED', approvalStatus: 'APPROVED' },
      });
    }

    return NextResponse.json(approval);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update approval' }, { status: 500 });
  }
}
