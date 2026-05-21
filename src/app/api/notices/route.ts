import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'notices.json');

export async function GET() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json([]);
    }
    const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    const notices = JSON.parse(fileContent);
    return NextResponse.json(notices);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read notices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
    
    if (!session?.user?.email || session.user.email.toLowerCase() !== masterEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { title, content, isNew } = await req.json();
    let notices = [];
    
    if (fs.existsSync(dataFilePath)) {
      const fileContent = fs.readFileSync(dataFilePath, 'utf8');
      notices = JSON.parse(fileContent);
    }
    
    const id = notices.length > 0 ? Math.max(...notices.map((n: any) => n.id)) + 1 : 1;
    
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    
    const notice = {
      id,
      title,
      content,
      date: dateStr,
      isNew: isNew ?? true
    };
    
    notices.unshift(notice);
    
    fs.writeFileSync(dataFilePath, JSON.stringify(notices, null, 2));
    
    return NextResponse.json(notice);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to write notice' }, { status: 500 });
  }
}
