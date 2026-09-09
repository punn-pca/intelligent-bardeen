import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth, hasPermission } from '@/lib/auth';
import { DEFAULT_COMPANY_CONFIG } from '@/lib/company-config';

export async function GET() {
  try {
    const setting = await prisma.companySetting.findUnique({
      where: { id: 'default' },
    });

    if (!setting) {
      return NextResponse.json(DEFAULT_COMPANY_CONFIG);
    }

    return NextResponse.json(setting);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch company settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const roleHeader = req.headers.get('x-user-role');
    const session = checkAuth(roleHeader);

    if (!hasPermission(session.role, 'company:manage')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();

    const updated = await prisma.companySetting.upsert({
      where: { id: 'default' },
      update: {
        name: body.name,
        taxId: body.taxId,
        address: body.address,
        phone: body.phone,
        email: body.email,
        website: body.website,
        logoUrl: body.logoUrl,
        bankName: body.bankName,
        bankAccountNo: body.bankAccountNo,
        bankAccountName: body.bankAccountName,
        defaultNotes: body.defaultNotes,
        signaturePreparedLabel: body.signaturePreparedLabel,
        signatureApprovedLabel: body.signatureApprovedLabel,
        signatureReceivedLabel: body.signatureReceivedLabel,
      },
      create: {
        id: 'default',
        name: body.name,
        taxId: body.taxId,
        address: body.address,
        phone: body.phone,
        email: body.email,
        website: body.website,
        logoUrl: body.logoUrl,
        bankName: body.bankName,
        bankAccountNo: body.bankAccountNo,
        bankAccountName: body.bankAccountName,
        defaultNotes: body.defaultNotes,
        signaturePreparedLabel: body.signaturePreparedLabel || 'ผู้จัดทำ (Prepared By)',
        signatureApprovedLabel: body.signatureApprovedLabel || 'ผู้อนุมัติ (Approved By)',
        signatureReceivedLabel: body.signatureReceivedLabel || 'ผู้รับสินค้า / ลูกค้า (Received By)',
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update company settings' }, { status: 400 });
  }
}
