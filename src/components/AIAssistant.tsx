'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: { name: string; slug: string }[];
  source?: string;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Xin chào! Mình là **Trợ lý AI LPhim** 🤖✨. Mình có thể giúp bạn gợi ý phim theo tâm trạng, thể loại, tìm kiếm diễn viên, review cốt truyện hoặc tiếp nhận báo lỗi & góp ý cho web.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved Gemini API Key on mount
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('lphim_gemini_key') || '';
      if (savedKey) setGeminiKey(savedKey);
    } catch {}
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleOpenFeedback = () => {
      setIsOpen(true);
      setInput('Tôi muốn báo lỗi / góp ý: ');
      setTimeout(() => inputRef.current?.focus(), 150);
    };

    window.addEventListener('open-feedback', handleOpenFeedback);
    return () => window.removeEventListener('open-feedback', handleOpenFeedback);
  }, []);

  const submitFeedbackToGoogleForm = (feedbackText: string) => {
    const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeuAuJK1aq38wmpTHVT_UY0aaU0vs6J0_ci2Hz43350ZPsaQw/formResponse';
    const formData = new URLSearchParams();
    formData.append('entry.1079451922', feedbackText);

    fetch(formUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }).catch((err) => console.error('Feedback submit error:', err));
  };

  const handleSendPrompt = (promptText: string) => {
    setInput(promptText);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSaveApiKey = (keyToSave: string) => {
    const clean = keyToSave.trim();
    setGeminiKey(clean);
    try {
      if (clean) {
        localStorage.setItem('lphim_gemini_key', clean);
      } else {
        localStorage.removeItem('lphim_gemini_key');
      }
    } catch {}
    setShowKeyModal(false);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content:
          'Đã làm mới cuộc trò chuyện! Bạn muốn tìm kiếm phim gì tiếp theo?',
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    // Check if user is reporting feedback / bug
    const feedbackRegex = /^(?:tôi\s+muốn\s+báo\s+lỗi|toi\s+muon\s+bao\s+loi)\s*\/\s*(?:góp\s+ý|gop\s+y)\s*:\s*(.*)$/i;
    const match = text.match(feedbackRegex);

    if (match) {
      const feedbackMsg = match[1].trim() || text;
      submitFeedbackToGoogleForm(feedbackMsg);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              'Cảm ơn bạn đã gửi ý kiến đóng góp cho LPhim! ❤️ Ý kiến của bạn đã được chuyển tới ban quản trị LPhim để xem xét và hoàn thiện trang web sớm nhất.',
          },
        ]);
      }, 500);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          messages: newMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          customApiKey: geminiKey,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI API error: ${res.status}`);
      }

      const data = await res.json();

      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'Xin chào! Mình có thể giúp gì thêm cho bạn?',
        recommendations: data.recommendations || [],
        source: data.source,
      };

      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Đã có sự cố kết nối với AI. Bạn hãy thử lại hoặc thử tìm kiếm phim trên thanh tìm kiếm nhé!',
          recommendations: [
            { name: '🔥 Top Phim Hot', slug: 'danh-sach/phim-moi-cap-nhat' },
            { name: '🎬 Phim Chiếu Rạp', slug: 'the-loai/hanh-dong' },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render bold markdown (**text**)
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, lIdx) => {
      // Split line by **bold**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={lIdx} style={{ display: 'block', minHeight: line.trim() ? 'auto' : '8px' }}>
          {parts.map((p, pIdx) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return <strong key={pIdx} style={{ color: '#fff', fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
            }
            return p;
          })}
        </span>
      );
    });
  };

  return (
    <>
      {/* AI Floating bubble */}
      <button
        className="ai-bubble"
        id="ai-bubble"
        type="button"
        title="Trợ lý AI LPhim"
        aria-label="Mở Trợ lý AI LPhim"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 150);
        }}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'}`}></i>
        {!isOpen && <span className="ai-bubble__badge">AI</span>}
      </button>

      {/* AI Chat Panel */}
      <div
        className={`ai-panel ${isOpen ? 'active' : ''}`}
        id="ai-panel"
        aria-hidden={!isOpen}
      >
        {/* Panel Header */}
        <div className="ai-panel__header">
          <div className="ai-panel__brand">
            <i className="fas fa-robot" style={{ color: 'var(--red, #e50914)' }}></i>
            <div>
              <h4 className="ai-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Trợ lý AI LPhim
                {geminiKey && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      background: 'rgba(70,211,105,0.2)',
                      color: '#46d369',
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    Gemini 2.5
                  </span>
                )}
              </h4>
              <span className="ai-panel__status">Trực tuyến 24/7</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              title="Cài đặt Gemini API Key"
              onClick={() => setShowKeyModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: geminiKey ? '#46d369' : 'var(--t3, #888)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: '4px',
                transition: 'color 0.2s',
              }}
            >
              <i className="fas fa-key"></i>
            </button>

            <button
              type="button"
              title="Xóa lịch sử trò chuyện"
              onClick={handleClearHistory}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--t3, #888)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: '4px',
                transition: 'color 0.2s',
              }}
            >
              <i className="fas fa-trash-can"></i>
            </button>

            <button
              className="ai-panel__close"
              id="ai-panel-close"
              type="button"
              aria-label="Đóng Trợ lý AI"
              onClick={() => setIsOpen(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Optional Gemini Key Settings Modal inside Panel */}
        {showKeyModal && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(20,20,30,0.98)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-key" style={{ color: 'var(--red, #e50914)' }}></i>
              <span>Google Gemini API Key:</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--t2, #a3a3a3)', marginBottom: 8 }}>
              Nhập API Key Gemini của bạn để trò chuyện trực tiếp với Gemini 1.5 Flash (hoặc để trống để dùng AI mặc định của web):
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: '#fff',
                  fontSize: '0.78rem',
                }}
              />
              <button
                type="button"
                onClick={() => handleSaveApiKey(geminiKey)}
                style={{
                  background: 'var(--red, #e50914)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ccc',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Chat Messages Body */}
        <div className="ai-panel__chat" id="ai-chat-body">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`ai-msg ${m.role === 'user' ? 'ai-msg--user' : 'ai-msg--bot'}`}
            >
              {m.role === 'assistant' && (
                <div className="ai-msg__avatar">
                  <i className="fas fa-robot"></i>
                </div>
              )}
              <div className="ai-msg__content">
                <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#e5e5e5' }}>
                  {renderFormattedText(m.content)}
                </div>

                {/* Quick Prompts (only on message 1) */}
                {m.id === '1' && (
                  <div className="ai-quick-prompts" style={{ marginTop: 12 }}>
                    <button
                      className="ai-quick-btn"
                      type="button"
                      onClick={() => handleSendPrompt('Gợi ý phim hành động chiếu rạp kịch tính')}
                    >
                      🎬 Phim hành động chiếu rạp
                    </button>
                    <button
                      className="ai-quick-btn"
                      type="button"
                      onClick={() => handleSendPrompt('Gợi ý phim bộ Hàn Quốc tình cảm hay nhất')}
                    >
                      🇰🇷 Phim bộ Hàn Quốc hay
                    </button>
                    <button
                      className="ai-quick-btn"
                      type="button"
                      onClick={() => handleSendPrompt('Gợi ý phim hoạt hình anime phiêu lưu')}
                    >
                      🍿 Anime phiêu lưu
                    </button>
                    <button
                      className="ai-quick-btn"
                      type="button"
                      onClick={() => handleSendPrompt('Tôi muốn báo lỗi / góp ý: ')}
                    >
                      💬 Báo lỗi & Góp ý
                    </button>
                  </div>
                )}

                {/* Movie Recommendation Badges */}
                {m.recommendations && m.recommendations.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--t2, #a3a3a3)', fontWeight: 700 }}>
                      PHIM ĐƯỢC GỢI Ý:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {m.recommendations.map((rec, rIdx) => (
                        <Link
                          key={rIdx}
                          href={`/${rec.slug}`}
                          onClick={() => setIsOpen(false)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(229,9,20,0.12)',
                            border: '1px solid rgba(229,9,20,0.3)',
                            borderRadius: 20,
                            fontSize: '0.78rem',
                            color: '#fff',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--red, #e50914)';
                            e.currentTarget.style.borderColor = 'var(--red, #e50914)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(229,9,20,0.12)';
                            e.currentTarget.style.borderColor = 'rgba(229,9,20,0.3)';
                          }}
                        >
                          <i className="fas fa-play" style={{ fontSize: '0.7rem', color: '#fff' }}></i>
                          <span>{rec.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="ai-msg ai-msg--bot">
              <div className="ai-msg__avatar">
                <i className="fas fa-robot"></i>
              </div>
              <div className="ai-msg__content">
                <div className="ai-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="ai-panel__input-area">
          <form
            className="ai-panel__form"
            id="ai-chat-form"
            autoComplete="off"
            onSubmit={handleSubmit}
          >
            <input
              ref={inputRef}
              className="ai-panel__input"
              id="ai-chat-input"
              type="text"
              placeholder="Hỏi AI về phim, diễn viên hoặc góp ý..."
              required
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className="ai-panel__send-btn"
              type="submit"
              aria-label="Gửi tin nhắn"
              disabled={isLoading}
            >
              <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
