
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Company } from "@/types/company";

export const dynamic = 'force-dynamic';

// This is a simplified GET handler for fetching exporters.
// A full implementation would have POST, PUT, DELETE for full CRUD.
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>("SELECT * FROM companies WHERE isDeleted = FALSE ORDER BY createdAt DESC");
    connection.release();

    const exporters: Company[] = rows.map(row => ({
        ...row,
        id: row.id.toString()
    }));

    return NextResponse.json(exporters);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching exporters' }, { status: 500 });
  }
}
