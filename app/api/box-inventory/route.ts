import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS box_inventory_boxes (
      id TEXT PRIMARY KEY NOT NULL,
      box_code TEXT NOT NULL UNIQUE,
      qr_token TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      warehouse_id TEXT,
      location_code TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS box_inventory_items (
      id TEXT PRIMARY KEY NOT NULL,
      box_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      lot TEXT,
      serial TEXT,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_box_items_box ON box_inventory_items(box_id)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_box_items_product ON box_inventory_items(product_id)`);
}

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const search = new URL(req.url).searchParams.get('search')?.trim() || '';
    const rows = search
      ? await prisma.$queryRawUnsafe<any[]>(`
          SELECT b.*, w.code AS warehouse_code, w.name AS warehouse_name
          FROM box_inventory_boxes b
          LEFT JOIN warehouses w ON w.id = b.warehouse_id
          WHERE b.box_code LIKE ? OR b.name LIKE ? OR b.location_code LIKE ?
          ORDER BY b.updated_at DESC
        `, `%${search}%`, `%${search}%`, `%${search}%`)
      : await prisma.$queryRawUnsafe<any[]>(`
          SELECT b.*, w.code AS warehouse_code, w.name AS warehouse_name
          FROM box_inventory_boxes b
          LEFT JOIN warehouses w ON w.id = b.warehouse_id
          ORDER BY b.updated_at DESC
        `);

    const ids = rows.map((r) => r.id);
    const items = ids.length
      ? await prisma.$queryRawUnsafe<any[]>(`
          SELECT i.*, p.sku, p.name AS product_name, p.barcode
          FROM box_inventory_items i
          LEFT JOIN products p ON p.id = i.product_id
          WHERE i.box_id IN (${ids.map(() => '?').join(',')})
          ORDER BY i.created_at ASC
        `, ...ids)
      : [];

    const grouped = new Map<string, any[]>();
    for (const item of items) grouped.set(item.box_id, [...(grouped.get(item.box_id) || []), item]);

    return NextResponse.json({ data: rows.map((r) => ({ ...r, items: grouped.get(r.id) || [] })) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load box inventory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const body = await req.json();
    const boxCode = String(body.boxCode || '').trim();
    if (!boxCode) return NextResponse.json({ error: 'กรุณาระบุรหัสกล่อง' }, { status: 400 });

    const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM box_inventory_boxes WHERE box_code = ?`, boxCode);
    if (existing.length) return NextResponse.json({ error: 'รหัสกล่องนี้มีอยู่แล้ว' }, { status: 409 });

    const id = randomUUID();
    const qrToken = `BOX:${boxCode}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO box_inventory_boxes (id, box_code, qr_token, name, warehouse_id, location_code, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id, boxCode, qrToken, String(body.name || boxCode), body.warehouseId || null, body.locationCode || null, body.status || 'ACTIVE', body.notes || null
    );

    for (const item of Array.isArray(body.items) ? body.items : []) {
      if (!item.productId || Number(item.quantity) <= 0) continue;
      await prisma.$executeRawUnsafe(
        `INSERT INTO box_inventory_items (id, box_id, product_id, quantity, lot, serial, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(), id, item.productId, Number(item.quantity), item.lot || null, item.serial || null, item.notes || null
      );
    }

    return NextResponse.json({ id, boxCode, qrToken }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create box' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureTables();
    const body = await req.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'Missing box id' }, { status: 400 });

    await prisma.$executeRawUnsafe(
      `UPDATE box_inventory_boxes SET name = ?, warehouse_id = ?, location_code = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      String(body.name || ''), body.warehouseId || null, body.locationCode || null, body.status || 'ACTIVE', body.notes || null, id
    );
    await prisma.$executeRawUnsafe(`DELETE FROM box_inventory_items WHERE box_id = ?`, id);
    for (const item of Array.isArray(body.items) ? body.items : []) {
      if (!item.productId || Number(item.quantity) <= 0) continue;
      await prisma.$executeRawUnsafe(
        `INSERT INTO box_inventory_items (id, box_id, product_id, quantity, lot, serial, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(), id, item.productId, Number(item.quantity), item.lot || null, item.serial || null, item.notes || null
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update box' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTables();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.$executeRawUnsafe(`DELETE FROM box_inventory_items WHERE box_id = ?`, id);
    await prisma.$executeRawUnsafe(`DELETE FROM box_inventory_boxes WHERE id = ?`, id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete box' }, { status: 500 });
  }
}
