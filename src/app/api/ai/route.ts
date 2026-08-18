import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, getMoviesByGenre, getMoviesByCountry, getLatestMovies, getMoviesByType } from '@/lib/api';

const SYSTEM_INSTRUCTION = `Bạn là "Trợ lý AI LPhim" - trợ lý ảo thông minh, vui vẻ và am hiểu điện ảnh hàng đầu của nền tảng xem phim trực tuyến LPhim.
Nhiệm vụ của bạn:
- Tư vấn, gợi ý các bộ phim lẻ, phim bộ, anime, phim chiếu rạp theo đúng nhu cầu, tâm trạng, thể loại, quốc gia hoặc diễn viên/đạo diễn mà người dùng yêu cầu.
- Tóm tắt cốt truyện ngắn gọn, hấp dẫn, không tiết lộ kết thúc (không spoil).
- Trả lời bằng tiếng Việt tự nhiên, thân thiện, dùng biểu tượng cảm xúc sinh động.
- Khi gợi ý các phim cụ thể, hãy liệt kê rõ ràng tên phim (cả tên tiếng Việt lẫn tên gốc) kèm 1-2 câu ngắn nêu điểm nổi bật của phim.
- Cuối câu trả lời, hãy đúc kết danh sách các phim được gợi ý theo định dạng sau trên từng dòng riêng biệt để hệ thống tạo nút bấm xem nhanh:
GỢI Ý: Tên Phim 1 | Tên Phim 2 | Tên Phim 3`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, messages = [], customApiKey } = body;

    const userQuery = prompt || messages[messages.length - 1]?.content || '';
    if (!userQuery.trim()) {
      return NextResponse.json({ error: 'Nội dung tin nhắn không được để trống' }, { status: 400 });
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

    // 1. If Gemini API Key is available, call Google Gemini 1.5 Flash API
    if (apiKey && apiKey.startsWith('AIzaSy')) {
      try {
        const geminiContents = messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

        if (geminiContents.length === 0 || geminiContents[geminiContents.length - 1]?.parts[0]?.text !== userQuery) {
          geminiContents.push({
            role: 'user',
            parts: [{ text: userQuery }],
          });
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiContents,
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }],
            },
            generationConfig: {
              temperature: 0.75,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (replyText) {
            // Extract recommendations from reply text
            const recMatches: { name: string; slug: string }[] = [];
            const recLineMatch = replyText.match(/GỢI Ý:\s*(.*)/i);

            if (recLineMatch && recLineMatch[1]) {
              const titles = recLineMatch[1].split('|').map((t) => t.trim()).filter(Boolean);
              for (const title of titles) {
                recMatches.push({
                  name: title,
                  slug: `tim-kiem?q=${encodeURIComponent(title)}`,
                });
              }
            }

            // Clean up the raw "GỢI Ý:" tag from visible text if desired
            const cleanText = replyText.replace(/GỢI Ý:\s*.*$/im, '').trim();

            return NextResponse.json({
              content: cleanText || replyText,
              recommendations: recMatches,
              source: 'gemini-1.5-flash',
            });
          }
        }
      } catch (geminiErr) {
        console.error('Gemini API call failed, falling back to Dynamic Semantic Engine:', geminiErr);
      }
    }

    // 2. Intelligent Dynamic Semantic Fallback Engine (Queries real LPhim database!)
    const lower = userQuery.toLowerCase();

    // Detect Genre
    const genreKeywords: Record<string, string> = {
      'hành động': 'hanh-dong',
      'hanh dong': 'hanh-dong',
      'action': 'hanh-dong',
      'tình cảm': 'tinh-cam',
      'tinh cam': 'tinh-cam',
      'lãng mạn': 'tinh-cam',
      'ngôn tình': 'tinh-cam',
      'hài hước': 'hai-huoc',
      'hai huoc': 'hai-huoc',
      'hài': 'hai-huoc',
      'cổ trang': 'co-trang',
      'co trang': 'co-trang',
      'kiếm hiệp': 'co-trang',
      'kinh dị': 'kinh-di',
      'kinh di': 'kinh-di',
      'ma': 'kinh-di',
      'hoạt hình': 'hoat-hinh',
      'hoat hinh': 'hoat-hinh',
      'anime': 'hoat-hinh',
      'viễn tưởng': 'vien-tuong',
      'khoa học': 'khoa-hoc',
      'tâm lý': 'tam-ly',
      'hình sự': 'hinh-su',
      'trinh thám': 'hinh-su',
      'chiến tranh': 'chien-tranh',
      'võ thuật': 'vo-thuat',
    };

    // Detect Country
    const countryKeywords: Record<string, string> = {
      'hàn quốc': 'han-quoc',
      'han quoc': 'han-quoc',
      'korea': 'han-quoc',
      'korean': 'han-quoc',
      'trung quốc': 'trung-quoc',
      'trung quoc': 'trung-quoc',
      'china': 'trung-quoc',
      'nhật bản': 'nhat-ban',
      'nhat ban': 'nhat-ban',
      'japan': 'nhat-ban',
      'âu mỹ': 'au-my',
      'au my': 'au-my',
      'mỹ': 'au-my',
      'hollywood': 'au-my',
      'thái lan': 'thai-lan',
      'thai lan': 'thai-lan',
      'việt nam': 'viet-nam',
      'viet nam': 'viet-nam',
    };

    let matchedGenreSlug = '';
    for (const [kw, slug] of Object.entries(genreKeywords)) {
      if (lower.includes(kw)) {
        matchedGenreSlug = slug;
        break;
      }
    }

    let matchedCountrySlug = '';
    for (const [kw, slug] of Object.entries(countryKeywords)) {
      if (lower.includes(kw)) {
        matchedCountrySlug = slug;
        break;
      }
    }

    let searchResult = null;

    if (matchedGenreSlug) {
      searchResult = await getMoviesByGenre(matchedGenreSlug, 1);
    } else if (matchedCountrySlug) {
      searchResult = await getMoviesByCountry(matchedCountrySlug, 1);
    } else if (lower.includes('phim bộ') || lower.includes('phim bo') || lower.includes('series')) {
      searchResult = await getMoviesByType('phim-bo', 1);
    } else if (lower.includes('phim lẻ') || lower.includes('phim le') || lower.includes('chiếu rạp')) {
      searchResult = await getMoviesByType('phim-le', 1);
    } else if (lower.includes('hoạt hình') || lower.includes('anime')) {
      searchResult = await getMoviesByType('hoat-hinh', 1);
    } else {
      // Search by keyword extracted from query
      const cleanKeyword = userQuery
        .replace(/^(gợi ý|tìm|xem|muốn xem|có phim|cho tôi|phim gì|tư vấn|bạn có biết)\s*/gi, '')
        .trim();

      if (cleanKeyword.length >= 2) {
        searchResult = await searchMovies(cleanKeyword, 8);
      }
      if (!searchResult || !searchResult.data?.items?.length) {
        searchResult = await getLatestMovies(1);
      }
    }

    const items = searchResult?.data?.items || [];
    const topMovies = items.slice(0, 5);

    let replyContent = '';
    const recommendations: { name: string; slug: string }[] = [];

    if (topMovies.length > 0) {
      replyContent = `Dưới đây là các bộ phim cực kỳ phù hợp và chất lượng trên LPhim dành cho yêu cầu **"${userQuery}"** của bạn:\n\n`;

      topMovies.forEach((m: any, idx: number) => {
        replyContent += `🎬 **${idx + 1}. ${m.name}** ${m.origin_name ? `(${m.origin_name})` : ''}\n`;
        replyContent += `• **Thông tin**: ${m.quality || 'FHD'} - ${m.lang || 'Vietsub'} ${m.year ? `• Năm: ${m.year}` : ''} ${m.episode_current ? `• ${m.episode_current}` : ''}\n`;
        if (m.content) {
          const shortDesc = m.content.replace(/<[^>]*>?/gm, '').slice(0, 120);
          replyContent += `• **Nội dung**: ${shortDesc}...\n`;
        }
        replyContent += `\n`;

        recommendations.push({
          name: m.name,
          slug: `phim/${m.slug}`,
        });
      });

      replyContent += `👉 Bạn có thể bấm trực tiếp vào các nút phim bên dưới để thưởng thức ngay lập tức! Chúc bạn xem phim vui vẻ ❤️`;
    } else {
      replyContent = `Chào bạn! Mình là Trợ lý AI LPhim. Đối với yêu cầu **"${userQuery}"**, bạn có thể tham khảo các danh mục phim đang rất hot bên dưới hoặc thử tìm kiếm với các từ khóa cụ thể hơn như *tên diễn viên*, *thể loại* hoặc *tên phim* nhé!`;
      recommendations.push(
        { name: '🔥 Top 10 Phim Hot Nhất', slug: 'danh-sach/phim-moi-cap-nhat' },
        { name: '🎬 Phim Chiếu Rạp Bom Tấn', slug: 'the-loai/hanh-dong' },
        { name: '🇰🇷 Phim Hàn Quốc Đỉnh Cao', slug: 'quoc-gia/han-quoc' },
        { name: '🎭 Phim Bộ Hay', slug: 'danh-sach/phim-bo' }
      );
    }

    return NextResponse.json({
      content: replyContent,
      recommendations,
      source: 'lphim-dynamic-engine',
    });
  } catch (err: any) {
    console.error('AI API Route Error:', err);
    return NextResponse.json(
      {
        content: 'Rất tiếc, đã có sự cố kết nối với hệ thống AI. Bạn vui lòng thử lại sau giây lát nhé!',
        recommendations: [
          { name: 'Khám Phá Phim Mới', slug: 'danh-sach/phim-moi-cap-nhat' },
          { name: 'Phim Bộ Hot', slug: 'danh-sach/phim-bo' },
        ],
      },
      { status: 200 }
    );
  }
}
