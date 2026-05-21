import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'notifications.json');

export async function GET() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json([]);
    }
    const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    const notifications = JSON.parse(fileContent);
    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read notifications' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, email, month, emrType } = await req.json();
    let notifications = [];
    
    if (fs.existsSync(dataFilePath)) {
      const fileContent = fs.readFileSync(dataFilePath, 'utf8');
      notifications = JSON.parse(fileContent);
    }
    
    const id = notifications.length > 0 ? Math.max(...notifications.map((n: any) => n.id)) + 1 : 1;
    
    const notification = {
      id,
      user,
      email,
      month,
      emrType,
      message: `${user || '사용자'}(${email})님이 ${month}월 ${emrType} 매출 통계를 업로드했습니다.`,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    notifications.unshift(notification);
    
    fs.writeFileSync(dataFilePath, JSON.stringify(notifications, null, 2));
    
    // 외부 알림 발송 (Slack or Telegram)
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (slackWebhook) {
      fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `🚀 [바른컨설팅 알림]\n${notification.message}` })
      }).catch(err => console.error('Slack notify error', err));
    }

    if (telegramToken && telegramChatId) {
      const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: `🚀 [바른컨설팅 알림]\n${notification.message}`
        })
      }).catch(err => console.error('Telegram notify error', err));
    }

    return NextResponse.json(notification);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to write notification' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({ success: true });
    }
    const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    let notifications = JSON.parse(fileContent);
    
    notifications = notifications.map((n: any) => ({ ...n, read: true }));
    
    fs.writeFileSync(dataFilePath, JSON.stringify(notifications, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
