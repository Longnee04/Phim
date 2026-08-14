'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: { name: string; slug: string }[];
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Xin chào! Mình là Trợ lý AI của LPhim. Mình có thể giúp gì cho bạn? Bạn có thể yêu cầu gợi ý phim, tìm kiếm diễn viên hoặc báo lỗi & góp ý cho web.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
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
            content: 'Cảm ơn bạn đã gửi ý kiến đóng góp cho LPhim! ❤️ Ý kiến của bạn đã được chuyển ngầm tới ban quản trị LPhim để xem xét và hoàn thiện trang web sớm nhất.',
          },
        ]);
      }, 500);
      return;
    }

    setIsLoading(true);

    try {
      setTimeout(() => {
        const reply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Dưới đây là một số gợi ý phim hay cho yêu cầu "${userMsg.content}" của bạn:`,
          recommendations: [
            { name: 'Khám Phá Phim Mới Nhất', slug: 'danh-sach/phim-moi-cap-nhat' },
            { name: 'Phim Chiếu Rạp Đỉnh Cao', slug: 'danh-sach/phim-le' },
            { name: 'Phim Bộ Hot Hiện Nay', slug: 'danh-sach/phim-bo' },
          ],
        };
        setMessages((prev) => [...prev, reply]);
        setIsLoading(false);
      }, 600);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
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

      {/* AI Chat Panel matching exact legacy structure */}
      <div
        className={`ai-panel ${isOpen ? 'active' : ''}`}
        id="ai-panel"
        aria-hidden={!isOpen}
      >
        <div className="ai-panel__header">
          <div className="ai-panel__brand">
            <i className="fas fa-robot"></i>
            <div>
              <h4 className="ai-panel__title">Trợ lý AI LPhim</h4>
              <span className="ai-panel__status">Trực tuyến</span>
            </div>
          </div>
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
                <p>{m.content}</p>
                {m.id === '1' && (
                  <div className="ai-quick-prompts">
                    <button
                      className="ai-quick-btn"
                      type="button"
                      onClick={() => handleSendPrompt('Tôi muốn báo lỗi / góp ý: ')}
                    >
                      💬 Báo lỗi & Góp ý
                    </button>
                    <button
                      className="ai-quick-btn"
                      type="button"
                      onClick={() => handleSendPrompt('Gợi ý phim hành động viễn tưởng mới nhất')}
                    >
                      🎭 Gợi ý theo thể loại
                    </button>
                    <button
                      className="ai-quick-btn"
                      type="button"
                      onClick={() => handleSendPrompt('Gợi ý các phim tình cảm chiếu rạp lãng mạn')}
                    >
                      🔥 Phim tình cảm hot
                    </button>
                  </div>
                )}
                {m.recommendations && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {m.recommendations.map((rec) => (
                      <Link
                        key={rec.slug}
                        href={`/${rec.slug}`}
                        onClick={() => setIsOpen(false)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          fontSize: '0.8rem',
                          color: 'var(--red)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600,
                        }}
                      >
                        <i className="fas fa-film"></i>
                        {rec.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="ai-msg ai-msg--bot">
              <div className="ai-msg__avatar"><i className="fas fa-robot"></i></div>
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

        {/* Input Area with exact .ai-panel__input-area & .ai-panel__form markup */}
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
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
