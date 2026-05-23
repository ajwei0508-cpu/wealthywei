"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { MessageSquare, ChevronRight, Calendar, Plus, Loader2, X, User, Heart, MessageCircle, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface CommentItem {
  id: number;
  author: string;
  content: string;
  date: string;
}

interface RequestItem {
  id: number;
  title: string;
  content: string;
  author: string;
  date: string;
  status: string;
  likes?: number;
  likedBy?: string[];
  comments?: CommentItem[];
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  
  const [commentInput, setCommentInput] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);

  const { data: session } = useSession();
  const userName = session?.user?.name || "사용자";
  const userEmail = session?.user?.email || "user@example.com";
  
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = userEmail.toLowerCase() === masterEmail.toLowerCase();

  const fetchRequests = () => {
    fetch("/api/requests")
      .then(res => res.json())
      .then(data => {
        setRequests(data);
        setLoading(false);
        // Update selected request if it's currently open
        if (selectedRequest) {
          const updated = data.find((r: RequestItem) => r.id === selectedRequest.id);
          if (updated) setSelectedRequest(updated);
          else setSelectedRequest(null);
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          author: userName
        })
      });

      if (res.ok) {
        setIsWriteModalOpen(false);
        setTitle("");
        setContent("");
        fetchRequests();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (id: number) => {
    try {
      await fetch("/api/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: 'like', user: userEmail })
      });
      fetchRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !commentInput.trim()) return;

    setIsCommentSubmitting(true);
    try {
      await fetch("/api/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: selectedRequest.id, 
          action: 'comment', 
          comment: { author: userName, content: commentInput }
        })
      });
      setCommentInput("");
      fetchRequests();
    } catch (error) {
      console.error(error);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await fetch("/api/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: 'status', status: newStatus })
      });
      fetchRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 이 요청사항을 삭제하시겠습니까?")) return;
    
    try {
      await fetch(`/api/requests?id=${id}`, { method: "DELETE" });
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-wider border border-green-500/30 whitespace-nowrap">처리 완료</span>;
      case 'in-progress':
        return <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/30 whitespace-nowrap">검토 중</span>;
      default:
        return <span className="px-2 py-1 rounded bg-slate-500/20 text-slate-400 text-[10px] font-black uppercase tracking-wider border border-slate-500/30 whitespace-nowrap">대기 중</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#05080F] text-white font-sans p-8 md:p-12 lg:p-20">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shrink-0">
                  <MessageSquare size={24} className="text-blue-400" />
                </div>
                <h1 className="text-4xl font-black tracking-tight break-keep">기능 추가 및 개선 요청사항</h1>
              </div>
              <p className="text-slate-400 font-medium text-lg ml-16 break-keep">
                마스터 및 모든 사용자가 함께 볼 수 있는 게시판입니다. 필요한 기능이나 건의사항을 자유롭게 남겨주세요.
              </p>
            </div>
            
            <button 
              onClick={() => setIsWriteModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
            >
              <Plus size={18} />
              요청사항 작성
            </button>
          </div>

          {/* Request List */}
          <div className="bg-[#0D1117]/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px]">
            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <Loader2 size={32} className="text-blue-500 animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 gap-4">
                <MessageSquare size={48} className="opacity-20" />
                <p className="font-medium text-lg">등록된 요청사항이 없습니다.</p>
                <button 
                  onClick={() => setIsWriteModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/80 transition-colors"
                >
                  첫 번째 요청사항 남기기
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {requests.map((req) => (
                  <div 
                    key={req.id} 
                    onClick={() => setSelectedRequest(req)}
                    className="group flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4 mb-3 md:mb-0">
                      <div className="w-16 flex-shrink-0 flex justify-center">
                        {getStatusBadge(req.status)}
                      </div>
                      <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-1">
                        {req.title}
                      </h3>
                      {req.likes ? (
                        <div className="flex items-center gap-1 text-rose-400 text-xs font-bold bg-rose-500/10 px-2 py-1 rounded-md">
                          <Heart size={12} className="fill-rose-400" /> {req.likes}
                        </div>
                      ) : null}
                      {req.comments && req.comments.length > 0 ? (
                        <div className="flex items-center gap-1 text-blue-400 text-xs font-bold bg-blue-500/10 px-2 py-1 rounded-md">
                          <MessageCircle size={12} /> {req.comments.length}
                        </div>
                      ) : null}
                    </div>
                    
                    <div className="flex items-center gap-5 ml-20 md:ml-0 text-slate-400 shrink-0">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <User size={14} className="opacity-50" />
                        <span className="max-w-[80px] truncate">{req.author}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Calendar size={14} className="opacity-50" />
                        {req.date}
                      </div>
                      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* Write Modal */}
      <AnimatePresence>
        {isWriteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-[#0F172A] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">요청사항 작성</h2>
                <button onClick={() => setIsWriteModalOpen(false)} className="text-white/50 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-white/80 mb-2">어떤 기능이나 개선이 필요하신가요?</label>
                  <input 
                    type="text" required value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="예: OOO 메뉴에 엑셀 다운로드 기능 추가 요청"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white/80 mb-2">상세 내용</label>
                  <textarea 
                    required value={content} onChange={e => setContent(e.target.value)} rows={8}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none transition-colors"
                    placeholder="현재 겪고 있는 불편함이나, 기능이 추가되었을 때 기대되는 효과 등을 상세히 적어주시면 검토에 큰 도움이 됩니다."
                  />
                </div>
                <div className="flex justify-end pt-4 gap-3 border-t border-white/5 mt-4">
                  <button type="button" onClick={() => setIsWriteModalOpen(false)} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors">
                    취소
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />} 등록하기
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-3xl bg-[#0F172A] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between p-6 border-b border-white/10 shrink-0">
                <div className="flex items-start gap-4 pr-4">
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  <h2 className="text-xl font-bold text-white leading-snug break-keep">{selectedRequest.title}</h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isMaster && (
                    <button 
                      onClick={() => handleDelete(selectedRequest.id)}
                      className="bg-rose-500/10 text-rose-400 p-2 rounded-full hover:bg-rose-500/20 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button onClick={() => setSelectedRequest(null)} className="text-white/50 hover:text-white bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* Modal Body */}
              <div className="p-0 overflow-y-auto flex flex-col md:flex-row">
                
                {/* Content Section */}
                <div className="p-6 md:w-3/5 border-b md:border-b-0 md:border-r border-white/10 flex flex-col">
                  <div className="flex items-center justify-between text-sm text-white/40 mb-6 pb-6 border-b border-white/5">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 font-medium px-3 py-1 bg-white/5 rounded-lg"><User size={14} className="text-blue-400" /> {selectedRequest.author}</div>
                      <div className="flex items-center gap-1.5 font-medium"><Calendar size={14} /> 작성일: {selectedRequest.date}</div>
                    </div>
                  </div>
                  
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-[15px] flex-1">
                    {selectedRequest.content}
                  </div>

                  {/* Likes and Master Controls */}
                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                    <button 
                      onClick={() => handleLike(selectedRequest.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        selectedRequest.likedBy?.includes(userEmail)
                          ? "bg-rose-500/20 border-rose-500/30 text-rose-400"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Heart size={16} className={selectedRequest.likedBy?.includes(userEmail) ? "fill-rose-400" : ""} />
                      <span className="font-bold">좋아요 {selectedRequest.likes || 0}</span>
                    </button>

                    {isMaster && (
                      <select 
                        value={selectedRequest.status}
                        onChange={(e) => handleStatusChange(selectedRequest.id, e.target.value)}
                        className="bg-black/40 border border-white/10 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="pending">대기 중</option>
                        <option value="in-progress">검토 중</option>
                        <option value="completed">처리 완료</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="p-6 md:w-2/5 flex flex-col bg-black/20">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <MessageCircle size={16} className="text-blue-400" />
                    댓글 <span className="text-blue-400">{selectedRequest.comments?.length || 0}</span>
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                    {(!selectedRequest.comments || selectedRequest.comments.length === 0) ? (
                      <div className="text-center text-white/30 text-sm py-10">
                        첫 번째 댓글을 남겨보세요.
                      </div>
                    ) : (
                      selectedRequest.comments.map(comment => (
                        <div key={comment.id} className="bg-white/5 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-blue-300">{comment.author}</span>
                            <span className="text-[10px] text-white/30">{comment.date}</span>
                          </div>
                          <p className="text-sm text-slate-300 leading-snug break-words">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleComment} className="mt-auto shrink-0 relative">
                    <textarea 
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      placeholder="댓글을 입력하세요..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none pr-12"
                      rows={2}
                      required
                    />
                    <button 
                      type="submit" 
                      disabled={isCommentSubmitting || !commentInput.trim()}
                      className="absolute right-2 bottom-2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {isCommentSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    </button>
                  </form>
                </div>
                
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
