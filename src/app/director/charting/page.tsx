'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Stethoscope, 
  Car, 
  ChevronRight, 
  ClipboardCopy, 
  CheckCircle2, 
  Sparkles,
  Search,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/DashboardLayout';

const CHART_DATA = [
  {
    category: "근골격계 (척추/상지)",
    icon: <Activity className="w-5 h-5" />,
    items: [
      {
        title: "허리",
        content: "오적산 1일\n기기구술 = 명문\n자락관법 신수 환도\nir = 허리\n일회용부항컵 4개-\n수양명경경락검사\n약침 무통 0.04cc 허리\n변증료 맥현 백태\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내\n\n추나요법 좌단족 단순후하방 요추 흉추 장골 드랍 요추회전변위 교정 경흉요추 쓰러스트 경추 js 경추 흉추 요추 칵스 시술아"
      },
      {
        title: "어깨",
        content: "구미강활탕 1일\n기기구술 = 대추\n자락관법 풍지 견정\nir = 어깨\n일회용부항컵 4개-\n수양명경경락검사\n약침 무통 0.04cc 어깨\n변증료 맥현 백태\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내\n\n추나요법 좌단족 단순후하방 요추 흉추 장골 드랍 요추회전변위 교정 경흉요추 쓰러스트 경추 js 경추 흉추 요추 칵스 시술"
      },
      {
        title: "어깨관절 (회전근개 오십견)",
        content: "구미강활탕 1일\n기기구술 = 견우\n자락관법 견정 노수\nir = 어깨\n일회용부항컵 4개-\n수양명경경락검사\n약침 황련해독탕 어깨\n변증료 맥현 백태\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내\n\n추나요법 좌단족 단순후하방 요추 흉추 장골 드랍 요추회전변위 교정 경흉요추 쓰러스트 경추 js 경추 흉추 요추 칵스 시술"
      },
      {
        title: "팔꿈치",
        content: "구미강활탕 1일\n기기구술 = 곡지\n자락관법 수삼리\nir = 팔꿈치\n일회용부항컵 4개-\n수양명경경락검사\n약침 황련해독탕 팔꿈치 \n변증료 맥현 윤택설\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      },
      {
        title: "손목",
        content: "구미강활탕 1일\n기기구술 = 외관\n자락관법 양지\nir = 손목\n일회용부항컵 4개-\n수양명경경락검사\n약침 황련해독탕 손목\n변증료 맥현 백태\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      },
      {
        title: "엄지손가락관절",
        content: "구미강활탕 1일\n기기구술 = 태연\n자락관법 어제\nir = 손가락\n일회용부항컵 4개-\n수양명경경락검사\n약침 황련해독탕 엄지손가락\n변증료 맥현 백태\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      }
    ]
  },
  {
    category: "근골격계 (하지)",
    icon: <Activity className="w-5 h-5" />,
    items: [
      {
        title: "무릎",
        content: "구미강활탕 1일\n기기구술 = 슬안\n자락관법 슬안\nir = 무릎\n일회용부항컵 4개-\n수양명경경락검사\n약침 황련해독탕 무릎\n변증료 맥현 백태\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내\n\n추나요법 좌단족 단순후하방 요추 흉추 장골 드랍 요추회전변위 교정 경흉요추 쓰러스트 경추 js 경추 흉추 요추 칵스 시술아"
      },
      {
        title: "발목",
        content: "구미강활탕 1일\n기기구술 = 해계\n자락관법 구허\nir = 발목\n일회용부항컵 4개-\n수양명경경락검사\n약침 황련해독탕 발목\n변증료 맥현 백태\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      },
      {
        title: "아킬레스 종골",
        content: "구미강활탕 1일\n기기구술 = 아킬레스건\n자락관법 종골\nir =발\n일회용부항컵 4개-\n수양명경경락검사\n약침 무통 0.04cc 종골\n변증료 맥약 백태\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      },
      {
        title: "발바닥",
        content: "구미강활탕 1일\n기기구술 = 연곡\n자락관법 연곡\nir =발\n일회용부항컵 4개-\n수양명경경락검사\n약침 황련해독탕 발바닥\n변증료 맥약 백태\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      },
      {
        title: "종아리",
        content: "구미강활탕 1일\n기기구술 = 승산\n자락관법 - 승근\nir - 종아리\n변증료 맥현 백태\n수양명경경락검사\n약침 무통 0.4cc\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      }
    ]
  },
  {
    category: "내과 및 기타 질환",
    icon: <Stethoscope className="w-5 h-5" />,
    items: [
      {
        title: "부종",
        content: "기기구술 = 중완\n반하사심탕 3일\n변증료 맥활 백태\n수양명경경락검사\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      },
      {
        title: "두통",
        content: "기기구술 = 중완\n반하사심탕 3일\n변증료 맥활 백태\n수양명경경락검사\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      },
      {
        title: "소화불량",
        content: "기기구술 = 중완\n반하사심탕 3일\n변증료 맥활 백태\n수양명경경락검사\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      },
      {
        title: "구안와사",
        content: "기기구술 = 합곡\n변증료 맥현 간실\n수양명경경락검사\n약침 무통 0.04cc 얼굴\n자락관법 예풍\n구마강활탕 1일 \n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술초진진단이며 미발견된 증상에 따라 추가적인 검사 및 치료 필요안내"
      }
    ]
  },
  {
    category: "자동차보험 (자보)",
    icon: <Car className="w-5 h-5" />,
    items: [
      {
        title: "자보 (어깨 허리)",
        content: "기기구술 = 명문\n자락관법 = 신수 환도 풍지 견정\nir =허리\n일회용부항컵 6개\n약침 무통 0.4cc 허리 목\n당귀수산 가감 10일처방 통증 및 어혈을 치료하기 위해 1일 2첩 처방 \n수양명경경락검사\n변증료 맥현\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술 /초진진단이며 미발견된  증상에 따라 추가적인 검사 및 치료 필요안내\n추나요법 좌단족 단순후하방 요추 흉추 장골 드랍 요추회전변위 교정 경흉요추 쓰러스트 경추 js 경추 흉추 요추 칵스 시술\n\n일당귀 3\t작약\t2\t오약\t2\t\t향부자\t2\t\t홍화\t2\t도인2계지\t1\t감초\t2\t대추\t2\t생강\t2\t갈근\t3\t마황\t2"
      },
      {
        title: "자보 (허리)",
        content: "기기구술 = 명문\n자락관법 = 신수 환도 \nir =허리\n일회용부항컵 6개\n약침 무통 0.4cc 허리 \n당귀수산 가감 10일처방 통증 및 어혈을 치료하기 위해 1일 2첩 처방 \n수양명경경락검사\n변증료 맥현\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술 /초진진단이며 미발견된  증상에 따라 추가적인 검사 및 치료 필요안내\n추나요법 좌단족 단순후하방 요추 흉추 장골 드랍 요추회전변위 교정 경흉요추 쓰러스트 경추 js 경추 흉추 요추 칵스 시술\n\n일당귀 3\t작약\t2\t오약\t2\t\t향부자\t2\t\t홍화\t2\t도인\t2\t계지\t1\t감초\t2\t대추\t2\t생강\t2\t갈근\t3\t마황\t2"
      },
      {
        title: "자보 (어깨)",
        content: "기기구술 = 대추\n자락관법 =  풍지 견정\nir =어깨\n일회용부항컵 6개\n약침 무통 0.4cc  목 대추 견정혈\n당귀수산 가감 10일처방 통증 및 어혈을 치료하기 위해 1일 2첩 처방 \n수양명경경락검사\n변증료 맥현\n침 뜸 부항 시술 / 시술부 소독함 / 자침깊이 최대 근막층까지 시술 /초진진단이며 미발견된  증상에 따라 추가적인 검사 및 치료 필요안내\n추나요법 좌단족 단순후하방 요추 흉추 장골 드랍 요추회전변위 교정 경흉요추 쓰러스트 경추 js 경추 흉추 요추 칵스 시술\n\n일당귀 3\t작약\t2\t오약\t2\t\t향부자\t2\t\t홍화\t2\t도인2계지\t1\t감초\t2\t대추\t2\t생강\t2\t갈근\t3\t마황\t2"
      }
    ]
  }
];

export default function ChartingTemplatesPage() {
  const [selectedItem, setSelectedItem] = useState(CHART_DATA[0].items[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("차팅 내용이 복사되었습니다.");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("복사에 실패했습니다.");
    }
  };

  const filteredData = CHART_DATA.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">질환별 스마트 차팅</h1>
          </div>
          <p className="text-gray-500 text-sm pl-12">클릭 한 번으로 원장님의 차팅 내용을 복사하여 EMR에 바로 적용하세요.</p>
        </div>
        
        {/* Search */}
        <div className="relative w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
            placeholder="질환명 또는 차팅 내용 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Sidebar - Categories & Items */}
        <div className="w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50/80 border-b border-gray-100">
            <h2 className="font-bold text-gray-700 text-sm">차팅 분류</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            {filteredData.length === 0 ? (
              <div className="text-center text-gray-400 py-10 text-sm">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredData.map((category, catIdx) => (
                <div key={catIdx} className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-1">
                    <div className="text-blue-500">
                      {category.icon}
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm">{category.category}</h3>
                  </div>
                  <div className="space-y-1">
                    {category.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        onClick={() => setSelectedItem(item)}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all group ${
                          selectedItem.title === item.title 
                            ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <span className={`text-sm font-medium ${selectedItem.title === item.title ? 'text-blue-700' : 'text-gray-600 group-hover:text-gray-900'}`}>
                          {item.title}
                        </span>
                        <ChevronRight className={`w-4 h-4 ${selectedItem.title === item.title ? 'text-blue-500' : 'text-gray-300 group-hover:text-gray-500'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Content Detail */}
        <div className="w-2/3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
          {/* Top Decorative bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 to-indigo-500"></div>
          
          <div className="p-8 flex-1 flex flex-col">
            <div className="flex items-start justify-between mb-8">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-3 border border-blue-100">
                  <Sparkles className="w-3.5 h-3.5" />
                  스마트 차팅 템플릿
                </span>
                <h2 className="text-2xl font-bold text-gray-900">{selectedItem.title}</h2>
              </div>
              <button
                onClick={() => handleCopy(selectedItem.content)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  copied 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md'
                }`}
              >
                {copied ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardCopy className="w-5 h-5" />}
                {copied ? '복사 완료!' : '차팅 복사하기'}
              </button>
            </div>

            <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 p-6 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <FileText className="w-32 h-32" />
              </div>
              <pre className="text-gray-700 font-medium whitespace-pre-wrap font-sans text-[15px] leading-relaxed relative z-10 h-full overflow-y-auto custom-scrollbar pr-4">
                {selectedItem.content}
              </pre>
            </div>
          </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
