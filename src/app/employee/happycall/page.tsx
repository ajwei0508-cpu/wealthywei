'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, Users, AlertCircle, Phone, Sparkles, Send, MessageSquare } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

// 환자 데이터 타입
interface FinalPatientFormat {
  name: string;
  phone: string;
  lastVisit: string;
  absentDays: number;
  status: '주의' | '집중' | '심각';
}

// AI 채팅 메시지 타입
interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export default function SmartPatientManagement() {
  // 상태 관리
  const [patients, setPatients] = useState<FinalPatientFormat[]>([]);
  const [stats, setStats] = useState({ total: 0, warning: 0, critical: 0, severe: 0 });
  
  // AI 채팅 상태 관리
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: '안녕하세요! 해피콜 안내 멘트 작성을 도와드릴까요? 아래 버튼을 누르거나 상황을 입력해 주세요.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 헤더 매핑 가이드 (Fuzzy Matching)
  const HEADER_MAPS = {
    name: ['이름', '환자명', '성명', '고객명', '환자이름'],
    phone: ['연락처', '전화번호', '휴대폰', '핸드폰', '폰번호', '전화'],
    lastVisit: ['최근방문일', '최종내원일', '최근내원일', '방문일자', '진료일자', '마지막방문일']
  };

  const findValueByKeys = (row: any, keys: string[]): string => {
    const rowKeys = Object.keys(row);
    const matchedKey = rowKeys.find(rk => keys.some(k => rk.replace(/\s+/g, '').includes(k)));
    return matchedKey ? String(row[matchedKey]).trim() : '';
  };

  // 엑셀 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      const today = new Date();
      const processed: FinalPatientFormat[] = [];
      let wCount = 0, cCount = 0, sCount = 0;

      rawJson.forEach((row) => {
        const name = findValueByKeys(row, HEADER_MAPS.name);
        const phone = findValueByKeys(row, HEADER_MAPS.phone);
        const lastVisitStr = findValueByKeys(row, HEADER_MAPS.lastVisit);

        if (!name || !lastVisitStr) return;

        const lastVisitDate = new Date(lastVisitStr);
        const diffDays = Math.ceil(Math.abs(today.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 4) {
          let status: '주의' | '집중' | '심각' = '주의';
          if (diffDays >= 8) { status = '심각'; sCount++; }
          else if (diffDays === 7) { status = '집중'; cCount++; }
          else { status = '주의'; wCount++; }

          processed.push({ name, phone, lastVisit: lastVisitStr, absentDays: diffDays, status });
        }
      });

      processed.sort((a, b) => b.absentDays - a.absentDays);
      setPatients(processed);
      setStats({ total: rawJson.length, warning: wCount, critical: cCount, severe: sCount });
    };
    reader.readAsBinaryString(file);
  };

  // 상태별 색상 반환 함수
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case '주의': return 'bg-green-100 text-green-800 border-green-200'; // 4~6일 초록색
      case '집중': return 'bg-red-100 text-red-800 border-red-200';       // 7일 빨간색
      case '심각': return 'bg-purple-100 text-purple-800 border-purple-200'; // 8일 이상 보라색
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // AI 메시지 전송 핸들러
  const handleSendAI = async (text: string) => {
    if (!text.trim()) return;
    
    // 사용자 메시지 추가
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatInput('');
    setIsTyping(true);

    try {
      // TODO: 실제 Gemini API 호출 로직을 여기에 구현합니다.
      // const response = await fetch('/api/gemini', { method: 'POST', body: JSON.stringify({ prompt: text }) });
      // const data = await response.json();
      
      // 시뮬레이션을 위한 가짜 딜레이
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let aiResponse = "기본 안내 멘트입니다. 환자분께 부드럽게 안부를 여쭤보세요.";
      if (text.includes('4일')) {
        aiResponse = "[4일차 해피콜 멘트 예시]\n안녕하세요, OOO 환자님. OO치과/의원입니다. 며칠 전 치료받으신 부위는 좀 어떠신가요? 불편하신 점이 없는지 안부 차 연락드렸습니다. 바쁘시더라도 시간 나실 때 한 번 내원해주시면 경과를 꼼꼼히 확인해 드리겠습니다. 편안한 하루 보내세요!";
      } else if (text.includes('7일')) {
        aiResponse = "[7일차 해피콜 멘트 예시]\n안녕하세요, OOO 환자님. OO치과/의원입니다. 지난번 방문하신 지 일주일 정도 지났는데, 그동안 내원이 없으셔서 걱정되는 마음에 연락드렸습니다. 치료 중간에 중단하시면 오히려 증상이 악화될 수 있으니, 편하신 시간에 꼭 예약 잡고 방문 부탁드립니다. 도와드릴 수 있는 부분이 있다면 언제든 말씀해주세요.";
      }

      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-2rem)] overflow-hidden">
        
        {/* 왼쪽: 환자 데이터 및 엑셀 분석 영역 (2칸 차지) */}
        <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">스마트 미내원 환자 관리</h1>
          <p className="text-gray-500 text-sm mt-1">엑셀 파일을 업로드하면 4/7/8일차 기준에 맞춰 자동 분류됩니다.</p>
        </div>

        {/* 엑셀 업로드 */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer relative transition-colors">
          <UploadCloud className="mx-auto w-10 h-10 text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-600 block">차트 엑셀 파일 업로드 (클릭 또는 드래그)</span>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>

        {/* 요약 카드 */}
        {stats.total > 0 && (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-lg border shadow-sm text-center">
              <span className="text-xs text-gray-500 font-medium">총 분석</span>
              <div className="text-lg font-bold text-gray-800">{stats.total}명</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200 shadow-sm text-center">
              <span className="text-xs text-green-700 font-medium">4~6일차 (주의)</span>
              <div className="text-lg font-bold text-green-800">{stats.warning}명</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200 shadow-sm text-center">
              <span className="text-xs text-red-700 font-medium">7일차 (집중)</span>
              <div className="text-lg font-bold text-red-800">{stats.critical}명</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 shadow-sm text-center">
              <span className="text-xs text-purple-700 font-medium">8일 이상 (심각)</span>
              <div className="text-lg font-bold text-purple-800">{stats.severe}명</div>
            </div>
          </div>
        )}

        {/* 리스트 테이블 */}
        {patients.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b font-medium text-gray-700 sticky top-0">
                <tr>
                  <th className="p-4">구분</th>
                  <th className="p-4">이름</th>
                  <th className="p-4">마지막 내원일</th>
                  <th className="p-4">미내원</th>
                  <th className="p-4 text-right">연락처</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyle(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-900">{p.name}</td>
                    <td className="p-4">{p.lastVisit}</td>
                    <td className="p-4 font-bold text-gray-800">{p.absentDays}일째</td>
                    <td className="p-4 text-right">
                      <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-xs text-gray-600 border border-gray-300 bg-white px-2.5 py-1.5 rounded-md hover:bg-gray-50">
                        <Phone size={12} /> 전화
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 오른쪽: AI 해피콜 어시스턴트 (제미나이 연동 창) */}
      <div className="lg:col-span-1 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm h-[750px]">
        <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2 rounded-t-xl">
          <Sparkles className="text-blue-500 w-5 h-5" />
          <h2 className="font-bold text-gray-800 text-lg">AI 해피콜 어시스턴트</h2>
        </div>
        
        {/* 채팅 메시지 영역 */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/30">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-line ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none shadow-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 text-gray-400 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                <span className="animate-bounce">●</span><span className="animate-bounce delay-100">●</span><span className="animate-bounce delay-200">●</span>
              </div>
            </div>
          )}
        </div>

        {/* 프롬프트 추천 버튼 */}
        <div className="p-3 border-t border-gray-100 bg-white flex flex-wrap gap-2">
          <button 
            onClick={() => handleSendAI('4일차 환자에게 안부를 묻는 부드러운 해피콜 멘트 작성해줘.')}
            className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors"
          >
            🟢 4일차 멘트 추천
          </button>
          <button 
            onClick={() => handleSendAI('7일차 환자에게 치료 중단의 위험성을 알리는 정중한 해피콜 멘트 작성해줘.')}
            className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors"
          >
            🔴 7일차 멘트 추천
          </button>
        </div>

        {/* 입력창 */}
        <div className="p-3 border-t border-gray-100 bg-white rounded-b-xl flex gap-2">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendAI(chatInput)}
            placeholder="상황을 입력해주세요..."
            className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-2 text-sm outline-none transition-all"
          />
          <button 
            onClick={() => handleSendAI(chatInput)}
            disabled={!chatInput.trim() || isTyping}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
