import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'requests.json');

function getRequests() {
  if (!fs.existsSync(dataFilePath)) return [];
  return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
}

function saveRequests(requests: any) {
  fs.writeFileSync(dataFilePath, JSON.stringify(requests, null, 2), 'utf8');
}

export async function GET() {
  try {
    return NextResponse.json(getRequests());
  } catch (error) {
    console.error('Error reading requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newRequest = await request.json();
    let requests = getRequests();
    
    const id = requests.length > 0 ? Math.max(...requests.map((r: any) => r.id)) + 1 : 1;
    const date = new Date().toISOString().split('T')[0];
    
    const requestToAdd = {
      id,
      title: newRequest.title,
      content: newRequest.content,
      author: newRequest.author || 'User',
      date,
      status: 'pending',
      likes: 0,
      likedBy: [],
      comments: []
    };
    
    requests.unshift(requestToAdd);
    saveRequests(requests);
    
    return NextResponse.json({ success: true, data: requestToAdd });
  } catch (error) {
    console.error('Error adding request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    let requests = getRequests();
    
    const index = requests.findIndex((r: any) => r.id === body.id);
    if (index === -1) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    
    if (body.action === 'like') {
      const user = body.user;
      if (!requests[index].likedBy) requests[index].likedBy = [];
      if (!requests[index].likes) requests[index].likes = 0;
      
      if (requests[index].likedBy.includes(user)) {
        requests[index].likedBy = requests[index].likedBy.filter((u: string) => u !== user);
        requests[index].likes -= 1;
      } else {
        requests[index].likedBy.push(user);
        requests[index].likes += 1;
      }
    } else if (body.action === 'comment') {
      if (!requests[index].comments) requests[index].comments = [];
      const commentId = requests[index].comments.length > 0 ? Math.max(...requests[index].comments.map((c: any) => c.id)) + 1 : 1;
      requests[index].comments.push({
        id: commentId,
        author: body.comment.author,
        content: body.comment.content,
        date: new Date().toISOString().split('T')[0]
      });
    } else if (body.action === 'status') {
      requests[index].status = body.status;
    }
    
    saveRequests(requests);
    return NextResponse.json({ success: true, data: requests[index] });
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0', 10);
    
    let requests = getRequests();
    requests = requests.filter((r: any) => r.id !== id);
    saveRequests(requests);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
