import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { createDocument } from '@/lib/document-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;
    const where: any = {};

    if (type) where.documentType = type;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { documentNo: { contains: search } },
        { notes: { contains: search } },
        { supplier: { name: { contains: search } } },
        { customer: { name: { contains: search } } },
      ];
    }

    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) where.issueDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.issueDate.lte = end;
      }
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          customer: { select: { id: true, code: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          targetWarehouse: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, name: true, username: true } },
          approvedBy: { select: { id: true, name: true, username: true } },
          items: {
            include: {
              product: { select: { id: true, sku: true, name: true, unit: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({
      data: documents,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const session = checkAuth(roleHeader);

    if (!hasPermission(session.role, 'documents:create')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const doc = await createDocument({
      ...body,
      createdById: session.id,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create document' }, { status: 400 });
  }
}
