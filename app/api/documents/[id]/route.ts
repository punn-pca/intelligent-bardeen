import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { approveDocument, issueDocument, cancelDocument } from '@/lib/document-engine';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        customer: true,
        warehouse: true,
        targetWarehouse: true,
        createdBy: { select: { id: true, name: true, username: true } },
        approvedBy: { select: { id: true, name: true, username: true } },
        items: {
          include: {
            product: true,
            location: true,
          },
        },
        movements: {
          include: {
            product: { select: { sku: true, name: true } },
            warehouse: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch document' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const session = checkAuth(roleHeader);
    const body = await req.json();

    const { action, reason } = body;

    if (action === 'approve') {
      if (!hasPermission(session.role, 'documents:approve')) {
        return NextResponse.json({ error: 'Permission denied for approval' }, { status: 403 });
      }
      const result = await approveDocument(params.id, session.id);
      return NextResponse.json(result);
    }

    if (action === 'issue') {
      if (!hasPermission(session.role, 'documents:create')) {
        return NextResponse.json({ error: 'Permission denied for issuing' }, { status: 403 });
      }
      const result = await issueDocument(params.id, session.id);
      return NextResponse.json(result);
    }

    if (action === 'cancel') {
      if (!hasPermission(session.role, 'documents:cancel')) {
        return NextResponse.json({ error: 'Permission denied for cancellation' }, { status: 403 });
      }
      const result = await cancelDocument(params.id, session.id, reason);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 400 });
  }
}
