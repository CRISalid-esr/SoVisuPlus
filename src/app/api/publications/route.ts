import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Publication } from '@prisma/client'

export const GET = async () => {
  try {
    const publications: Publication[] = await prisma.publication.findMany()
    return NextResponse.json(publications);
  } catch (error) {
    console.error('Error fetching publications:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
};
