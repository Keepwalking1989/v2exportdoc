
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileData, fileName } = body;

    if (!fileData || !fileName) {
      return NextResponse.json({ message: 'Missing file data or name' }, { status: 400 });
    }

    // Extract the base64 part of the data URI
    const base64Data = fileData.split(';base64,').pop();
    if (!base64Data) {
        return NextResponse.json({ message: 'Invalid data URI' }, { status: 400 });
    }
    
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    
    // Define the path to the public directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'bills');
    const filePath = path.join(uploadDir, uniqueFileName);

    // Ensure the directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Write the file
    await fs.writeFile(filePath, base64Data, 'base64');

    // Return the public path to the file
    const publicPath = `/uploads/bills/${uniqueFileName}`;
    
    return NextResponse.json({ filePath: publicPath }, { status: 201 });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ message: 'Error uploading file' }, { status: 500 });
  }
}
