"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PPTViewer from "@/components/PPTViewer";
import { Presentation, FolderOpen, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 통합된 PPT 자료실 데이터
const trainingMaterials = [
  {
    id: "rec-ppt-1",
    category: "접수실",
    title: "접수실 교육",
    description: "환자 안내 및 결제 응대를 위한 접수실 전용 교육 자료입니다.",
    type: "iframe",
    iframeUrl: "https://drive.google.com/file/d/1PnxcJALkIxDV7pfKNT0dsR3e96jWhR09/preview",
    coverImage: "/reception_payment.png"
  },
  {
    id: "trt-ppt-1",
    category: "치료실",
    title: "치료실 교육",
    description: "물리치료 및 환자 케어 등 치료실 실무에 대한 전용 교육 자료입니다.",
    type: "iframe",
    iframeUrl: "https://drive.google.com/file/d/1PnxcJALkIxDV7pfKNT0dsR3e96jWhR09/preview",
    coverImage: "/treatment_therapy.png"
  },
  {
    id: "mgr-ppt-1",
    category: "실장",
    title: "실장 교육",
    description: "실장님을 위한 환자 상담 및 매출 증대 시뮬레이션 자료입니다.",
    type: "iframe",
    iframeUrl: "https://drive.google.com/file/d/1OlWYPj35tqna_jvpzSipgRByokqnMB86/preview",
    coverImage: "/manager_consulting.png"
  }
];

export default function TrainingBoardPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedMaterial, setSelectedMaterial] = useState<typeof trainingMaterials[0] | null>(null);

  const categories = ["전체", "접수실", "치료실", "실장"];
  
  const filteredMaterials = selectedCategory === "전체" 
    ? trainingMaterials 
    : trainingMaterials.filter(m => m.category === selectedCategory);

  return (
    <DashboardLayout>
      <div className="p-8 md:p-12 lg:p-20 max-w-7xl mx-auto h-full overflow-y-auto">
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-emerald-600/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
              <Presentation size={28} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">교육 자료실</h1>
              <p className="text-white/60 font-medium text-lg mt-1">접수실, 치료실, 실장 전용 교육 PPT 자료를 열람할 수 있는 게시판입니다.</p>
            </div>
          </div>
        </div>

        {selectedMaterial ? (
          <div className="space-y-6">
            <button 
              onClick={() => setSelectedMaterial(null)}
              className="text-white/60 hover:text-white text-sm font-bold flex items-center gap-2 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl transition-colors w-fit shadow-lg"
            >
              ← 자료 목록으로 돌아가기
            </button>
            <div className="bg-[#0F172A] border border-white/10 p-6 rounded-3xl shadow-2xl">
              <div className="mb-4">
                <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-600/20 text-amber-300 rounded-md flex items-center gap-1 border border-emerald-600/20 w-fit mb-2">
                  <Tag size={10} /> {selectedMaterial.category}
                </span>
                <h2 className="text-2xl font-black text-white mb-2">{selectedMaterial.title}</h2>
                <p className="text-white/60">{selectedMaterial.description}</p>
              </div>
              {selectedMaterial.type === "iframe" ? (
                <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
                  <iframe 
                    src={selectedMaterial.iframeUrl}
                    className="w-full h-full border-0 absolute inset-0"
                    allowFullScreen
                  />
                </div>
              ) : (
                <PPTViewer 
                  slides={selectedMaterial.slides || []} 
                  title={selectedMaterial.title} 
                  onClose={() => setSelectedMaterial(null)} 
                />
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(category => (
                <button 
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all whitespace-nowrap border ${
                    selectedCategory === category
                      ? "bg-emerald-600 border-emerald-500/50 text-white shadow-emerald-500/20"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredMaterials.length > 0 ? (
                  filteredMaterials.map((material, idx) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      key={material.id}
                      onClick={() => setSelectedMaterial(material)}
                      className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden cursor-pointer hover:bg-white/10 hover:border-emerald-500/50 transition-all shadow-xl hover:-translate-y-1"
                    >
                      <div className="aspect-video relative overflow-hidden bg-black/50">
                        <img 
                          src={material.coverImage} 
                          alt={material.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                            <Presentation size={18} /> PPT 보기
                          </div>
                        </div>
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/10 shadow-lg">
                          {(selectedMaterial as any)?.type === "iframe" || (material as any).type === "iframe" ? "구글 슬라이드" : `슬라이드 ${material.slides?.length || 0}장`}
                        </div>
                        <div className="absolute top-4 right-4 bg-emerald-600/90 text-amber-300 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-xs font-black border border-emerald-500/30 shadow-lg">
                          {material.category}
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                          {material.title}
                        </h3>
                        <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">
                          {material.description}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="col-span-full py-24 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl border-dashed"
                  >
                    <FolderOpen size={56} className="text-white/20 mb-4" />
                    <p className="text-white/60 font-bold text-lg">해당 카테고리에 등록된 PPT 자료가 없습니다.</p>
                    <p className="text-white/40 mt-2 text-sm">추후 업데이트될 예정입니다.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
