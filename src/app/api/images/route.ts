import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    if (!folder || !['banner', 'thumb'].includes(folder)) {
      console.error('Invalid or missing folder:', folder);
      return NextResponse.json({ error: 'Valid folder (banner or thumb) is required' }, { status: 400 });
    }

    const dirPath = path.join(process.cwd(), 'public', folder);
    const files = await fs.readdir(dirPath);
    const images = files
      .filter((file) => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map((file) => `/${folder}/${file}`);
    console.log(`Fetched images for ${folder}:`, images);

    return NextResponse.json(images);
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching images:', err);
    return NextResponse.json(
      { error: 'Failed to fetch images', details: err.message },
      { status: 500 }
    );
  }
}