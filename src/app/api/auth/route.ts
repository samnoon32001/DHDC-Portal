import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or credentials' }, { status: 401 });
    }

    if (user.status === 'inactive') {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    // If user has a hashed password, verify with bcrypt; otherwise direct comparison or initial login
    if (user.password && password) {
      const isMatch =
        user.password === password ||
        (await bcrypt.compare(password, user.password).catch(() => false));

      if (!isMatch) {
        return NextResponse.json({ error: 'Invalid username or credentials' }, { status: 401 });
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        admissionNumber: user.admissionNumber,
        studentId: user.studentId,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Auth route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
