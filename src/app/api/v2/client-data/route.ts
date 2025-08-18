
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Client } from "@/types/client";
import { OkPacket } from 'mysql2';

// GET handler to fetch all non-deleted clients
export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query<any[]>("SELECT * FROM clients WHERE isDeleted = FALSE ORDER BY createdAt DESC");
    connection.release();

    const clients: Client[] = rows.map(row => ({
        ...row,
        id: row.id.toString()
    }));

    return NextResponse.json(clients);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching clients' }, { status: 500 });
  }
}

// POST handler to create a new client
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, person, contactNumber, address, city, country, pinCode } = body;

    if (!companyName || !person || !contactNumber || !address || !city || !country || !pinCode) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query<OkPacket>(
      'INSERT INTO clients (companyName, person, contactNumber, address, city, country, pinCode) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [companyName, person, contactNumber, address, city, country, pinCode]
    );
    connection.release();

    const newClientId = result.insertId;

    const newClient: Client = {
        id: newClientId.toString(),
        companyName,
        person,
        contactNumber,
        address,
        city,
        country,
        pinCode,
    };

    return NextResponse.json(newClient, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating client' }, { status: 500 });
  }
}

// PUT handler to update a client
export async function PUT(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Client ID is required' }, { status: 400 });
    }
    
    try {
        const body: Client = await request.json();
        const { companyName, person, contactNumber, address, city, country, pinCode } = body;

        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE clients SET companyName = ?, person = ?, contactNumber = ?, address = ?, city = ?, country = ?, pinCode = ? WHERE id = ?',
            [companyName, person, contactNumber, address, city, country, pinCode, id]
        );
        connection.release();

        return NextResponse.json({ ...body, id }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error updating client' }, { status: 500 });
    }
}

// DELETE handler to soft-delete a client
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ message: 'Client ID is required' }, { status: 400 });
    }

    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE clients SET isDeleted = TRUE WHERE id = ?', [id]);
        connection.release();
        return NextResponse.json({ message: 'Client marked as deleted' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting client:", error);
        return NextResponse.json({ message: 'Error deleting client' }, { status: 500 });
    }
}
