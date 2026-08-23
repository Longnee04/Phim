import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, getMoviesByGenre, getMoviesByCountry, getLatestMovies, getMoviesByType, getMovieDetail } from '@/lib/api';

const SYSTEM_INSTRUCTION = `Bạn là "Trợ lý AI LPhim" - trợ lý ảo thông minh, vui vẻ và am hiểu sâu sắc về điện ảnh trên nền tảng xem phim trực tuyến LPhim.

Quy tắc ứng xử và trả lời:
1. TRẢ LỜI ĐÚNG TRỌNG TÂM CÂU HỎI:
   - Nếu người dùng chào hỏi, hỏi thăm, trò chuyện thông thường: Hãy chào lại một cách thân thiện, hài hước, giới thiệu bản thân là Trợ lý AI LPhim và hỏi xem bạn có thể giúp gì về phim ảnh.
   - Nếu người dùng hỏi hướng dẫn sử dụng web LPhim (lưu phim, xem tiếp, phím tắt, đổi server, báo lỗi, bỏ qua quảng cáo): Hãy hướng dẫn chi tiết, dễ hiểu các tính năng của trang web LPhim.
   - Nếu người dùng hỏi về thông tin phim, diễn viên, đạo diễn, tóm tắt cốt truyện: Trả lời chính xác, hấp dẫn, ngắn gọn và TUYỆT ĐỐI KHÔNG spoil (không tiết lộ kết thúc).
   - Nếu người dùng yêu cầu gợi ý/tư vấn phim theo tâm trạng, thể loại, quốc gia: Hãy gợi ý 3-5 bộ phim hay nhất kèm 1-2 câu tóm tắt điểm đặc sắc của từng phim.
2. ĐỊNH DẠNG:
   - Dùng tiếng Việt tự nhiên, định dạng Markdown rõ ràng (in đậm tên phim, gạch đầu dòng).
   - Khi có gợi ý phim cụ thể mà người dùng có thể xem trên web, hãy đính kèm dòng sau ở cuối cùng:
GỢI Ý: Tên Phim 1 | Tên Phim 2 | Tên Phim 3`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, messages = [], customApiKey } = body;

    const userQuery = (prompt || messages[messages.length - 1]?.content || '').trim();
    if (!userQuery) {
      return NextResponse.json({ error: 'Nội dung tin nhắn không được để trống' }, { status: 400 });
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

    // =========================================================================
    // 1. CALL GOOGLE GEMINI API (TRY GEMINI 1.5 FLASH -> GEMINI 2.0 FLASH -> 1.5 PRO)
    // =========================================================================
    if (apiKey && apiKey.startsWith('AIzaSy')) {
      const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

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

      for (const modelName of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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
                maxOutputTokens: 1200,
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (replyText) {
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

              const cleanText = replyText.replace(/GỢI Ý:\s*.*$/im, '').trim();

              return NextResponse.json({
                content: cleanText || replyText,
                recommendations: recMatches,
                source: modelName,
              });
            }
          }
        } catch (modelErr) {
          console.warn(`Gemini ${modelName} failed, trying next candidate:`, modelErr);
        }
      }
    }

    // =========================================================================
    // 2. INTELLIGENT CONVERSATIONAL NLP ENGINE (SMART INTENT DISPATCHER)
    // =========================================================================
    const lower = userQuery.toLowerCase();
    const normalize = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const lowerNonAccent = normalize(userQuery);

    // -------------------------------------------------------------------------
    // A. GREETING & CHIT-CHAT (Chào hỏi, hỏi thăm, danh tính)
    // -------------------------------------------------------------------------
    const isGreeting =
      /^(chào|chao|hi|hello|hey|alo|ê|xin chào|good morning|good evening|good afternoon)\b/i.test(lower) ||
      lower.length <= 4 ||
      lower === 'chào bạn' ||
      lower === 'xin chào';

    if (isGreeting) {
      return NextResponse.json({
        content: `Xin chào bạn! 👋 Mình là **Trợ lý AI LPhim** 🤖✨\n\nMình có thể giúp bạn:\n• 🎬 **Gợi ý phim** theo tâm trạng, thể loại, quốc gia hoặc diễn viên.\n• 📖 **Tóm tắt cốt truyện** & đánh giá độ cuốn của bất kỳ bộ phim nào.\n• 🛠️ **Hướng dẫn sử dụng** các tính năng của LPhim (lưu phim, xem dở, phím tắt, đổi server...).\n• 💬 **Tiếp nhận báo lỗi & góp ý** để cải thiện web.\n\nHôm nay bạn muốn tìm phim gì hoặc cần mình hỗ trợ điều gì nào?`,
        recommendations: [
          { name: '🔥 Phim Mới Cập Nhật', slug: 'danh-sach/phim-moi-cap-nhat' },
          { name: '💥 Phim Hành Động', slug: 'the-loai/hanh-dong' },
          { name: '🇰🇷 Phim Hàn Quốc Hot', slug: 'quoc-gia/han-quoc' },
          { name: '🍿 Anime Hấp Dẫn', slug: 'the-loai/anime' },
        ],
        source: 'lphim-nlp-assistant',
      });
    }

    // Identity / "Bạn là ai"
    if (
      lower.includes('bạn là ai') ||
      lower.includes('ban la ai') ||
      lower.includes('ai tạo ra bạn') ||
      lower.includes('tên bạn là gì') ||
      lower.includes('ai day') ||
      lower.includes('who are you')
    ) {
      return NextResponse.json({
        content: `Mình là **Trợ lý AI LPhim** 🤖🎬 — một trợ lý ảo am hiểu điện ảnh được tích hợp trực tiếp trên nền tảng xem phim **LPhim**.\n\nMục tiêu của mình là giúp bạn tìm kiếm được những bộ phim ưng ý nhất trong tích tắc, trả lời mọi thắc mắc về phim ảnh và hỗ trợ bạn trải nghiệm xem phim tuyệt vời nhất! ❤️`,
        recommendations: [
          { name: '🎬 Khám Phá Phim Ngay', slug: 'danh-sach/phim-moi-cap-nhat' },
          { name: '🎭 Phim Bộ Hot', slug: 'danh-sach/phim-bo' },
        ],
        source: 'lphim-nlp-assistant',
      });
    }

    // Gratitude & Farewell
    if (lower.includes('cảm ơn') || lower.includes('cam on') || lower.includes('thank') || lower.includes('tks')) {
      return NextResponse.json({
        content: `Không có chi nè! 🥰 Chúc bạn có những phút giây xem phim thật thư giãn và tuyệt vời trên LPhim nhé! Nếu cần thêm gợi ý gì cứ nhắn mình nha. ❤️🎬`,
        recommendations: [],
        source: 'lphim-nlp-assistant',
      });
    }

    if (lower.includes('tạm biệt') || lower.includes('tam biet') || lower.includes('bye') || lower.includes('ngủ ngon')) {
      return NextResponse.json({
        content: `Tạm biệt bạn nhé! 👋 Hẹn gặp lại bạn lần sau trên LPhim. Chúc bạn một ngày tốt lành! ✨`,
        recommendations: [],
        source: 'lphim-nlp-assistant',
      });
    }

    // -------------------------------------------------------------------------
    // B. WEBSITE FEATURES & HELP (Hướng dẫn sử dụng website LPhim)
    // -------------------------------------------------------------------------
    // 1. Lưu phim / Tủ phim
    if (
      lower.includes('lưu phim') ||
      lower.includes('luu phim') ||
      lower.includes('tủ phim') ||
      lower.includes('tu phim') ||
      lower.includes('danh sách của tôi') ||
      lower.includes('danh sach cua toi') ||
      lower.includes('bookmark')
    ) {
      return NextResponse.json({
        content: `📌 **Hướng dẫn sử dụng tính năng Lưu phim trên LPhim:**\n\n1. **Cách lưu phim**: Khi vào trang thông tin hoặc trang xem phim, bạn bấm nút **"+ Lưu phim"** (hoặc icon bookmark trên thẻ phim). Phim sẽ được lưu ngay lập tức vào trình duyệt của bạn.\n2. **Xem lại danh sách đã lưu**: Bạn vào mục **"Danh sách của tôi"** trên thanh menu (hoặc truy cập [/danh-sach-cua-toi](/danh-sach-cua-toi)) để xem lại toàn bộ phim bạn đã lưu và các phim đang xem dở bất cứ lúc nào!`,
        recommendations: [
          { name: '📂 Mở Tủ Phim Của Bạn', slug: 'danh-sach-cua-toi' },
        ],
        source: 'lphim-nlp-assistant',
      });
    }

    // 2. Tiếp tục xem / Xem dở
    if (
      lower.includes('xem dở') ||
      lower.includes('xem do') ||
      lower.includes('tiếp tục xem') ||
      lower.includes('tiep tuc xem') ||
      lower.includes('lịch sử xem') ||
      lower.includes('lich su xem')
    ) {
      return NextResponse.json({
        content: `⏱️ **Tính năng Tiếp tục xem (Lưu tiến trình tự động):**\n\n• Hệ thống LPhim tự động ghi nhớ chính xác tập phim và **số phút/giây** bạn đang xem dở.\n• Khi bạn quay lại Trang chủ hoặc vào mục **"Danh sách của tôi" -> "Tiếp tục xem"**, hàng phim đang xem dở sẽ hiển thị thanh tiến trình màu đỏ kèm nút **"Tiếp tục xem"** để bạn bấm vào xem tiếp ngay đoạn dừng mà không cần tìm lại!`,
        recommendations: [
          { name: '📂 Xem Phim Đang Xem Dở', slug: 'danh-sach-cua-toi' },
        ],
        source: 'lphim-nlp-assistant',
      });
    }

    // 3. Chuyển tập / Tự chuyển tập
    if (
      lower.includes('chuyển tập') ||
      lower.includes('chuyen tap') ||
      lower.includes('tự chuyển tập') ||
      lower.includes('tu chuyen tap') ||
      lower.includes('auto next')
    ) {
      return NextResponse.json({
        content: `⏭️ **Tính năng Tự Động Chuyển Tập:**\n\n• Trên thanh điều khiển dưới khung video có nút **"Tự chuyển tập: BẬT/TẮT"**.\n• Khi bật, khi một tập phim phát hết, web sẽ tự động phát tập tiếp theo kèm thông báo đếm ngược chuyển tập kiểu Netflix để bạn không cần bấm chuột thủ công!\n• Bạn cũng có thể nhấn phím **N** trên bàn phím để chuyển nhanh sang tập kế tiếp.`,
        recommendations: [
          { name: '📺 Danh Sách Phim Bộ', slug: 'danh-sach/phim-bo' },
        ],
        source: 'lphim-nlp-assistant',
      });
    }

    // 4. Bỏ qua quảng cáo / Phím tắt
    if (
      lower.includes('quảng cáo') ||
      lower.includes('quang cao') ||
      lower.includes('bỏ qua') ||
      lower.includes('phím tắt') ||
      lower.includes('phim tat') ||
      lower.includes('shortcut')
    ) {
      return NextResponse.json({
        content: `⏩ **Phím tắt & Bỏ qua quảng cáo mở đầu trên LPhim:**\n\n• **Bỏ qua quảng cáo/Intro**: Bạn có thể bật **"Bỏ qua QC: BẬT"** trên thanh điều khiển (tùy chọn 15s/30s/45s/60s) hoặc bấm nút vàng **[ ⏩ Bỏ qua QC ]** trên màn hình.\n• **Các phím tắt tiện lợi khi xem phim:**\n  - **Phím Space / K**: Tạm dừng / Phát tiếp.\n  - **Phím S**: Bỏ qua ngay 30 giây quảng cáo.\n  - **Phím D**: Bỏ qua ngay 60 giây quảng cáo.\n  - **Phím ← / →**: Tua lùi 10s / Tua tới 10s.\n  - **Phím F**: Bật / Tắt toàn màn hình.\n  - **Phím M**: Tắt / Bật âm thanh.\n  - **Phím N**: Chuyển nhanh sang tập tiếp theo.`,
        recommendations: [],
        source: 'lphim-nlp-assistant',
      });
    }

    // 5. Lỗi video / Giật lag / Đổi server
    if (
      lower.includes('lag') ||
      lower.includes('giật') ||
      lower.includes('không xem được') ||
      lower.includes('khong xem duoc') ||
      lower.includes('lỗi phim') ||
      lower.includes('loi phim') ||
      lower.includes('đổi server') ||
      lower.includes('doi server') ||
      lower.includes('đổi nguồn')
    ) {
      return NextResponse.json({
        content: `🛠️ **Cách khắc phục khi phim bị giật lag hoặc không tải được:**\n\n1. **Đổi Server phát**: Dưới khung video có mục **"Chọn Server & Nguồn Phát"**. Bạn hãy thử chuyển sang **Server #2 (Dự phòng)** hoặc chọn nguồn khác như **KKPhim / OPhim / NguonC**.\n2. **Đổi chế độ Player**: Bấm nút **"Chế độ: Direct (HLS)"** hoặc **"Chế độ: Iframe Embed"** để chuyển đổi giữa 2 trình phát video khác nhau.\n3. **Tải lại trang**: Nhấn tổ hợp phím **Ctrl + F5** để làm mới bộ nhớ đệm trình duyệt.`,
        recommendations: [],
        source: 'lphim-nlp-assistant',
      });
    }

    // -------------------------------------------------------------------------
    // C. SPECIFIC MOVIE QUESTION / PLOT SUMMARY / CAST / TRIVIA
    // -------------------------------------------------------------------------
    const isSummaryQuestion =
      lower.includes('tóm tắt') ||
      lower.includes('tom tat') ||
      lower.includes('nội dung') ||
      lower.includes('noi dung') ||
      lower.includes('cốt truyện') ||
      lower.includes('cot truyen') ||
      lower.includes('kể về gì') ||
      lower.includes('ke ve gi') ||
      lower.includes('có hay không') ||
      lower.includes('co hay khong') ||
      lower.includes('review') ||
      lower.includes('diễn viên') ||
      lower.includes('dien vien') ||
      lower.includes('đạo diễn') ||
      lower.includes('dao dien');

    if (isSummaryQuestion) {
      // Extract target movie keyword
      const targetQuery = userQuery
        .replace(/(tóm tắt|tom tat|nội dung|noi dung|cốt truyện|cot truyen|kể về gì|ke ve gi|phim|review|có hay không|co hay khong|diễn viên|dien vien|đạo diễn|dao dien|cho tôi biết|hãy|bạn có thể|về)\s*/gi, '')
        .trim();

      if (targetQuery.length >= 2) {
        const searchRes = await searchMovies(targetQuery, 3);
        const firstMovie = searchRes?.data?.items?.[0];

        if (firstMovie) {
          const detailRes = await getMovieDetail(firstMovie.slug);
          const fullMovie = detailRes?.movie || firstMovie;
          const cleanDesc = fullMovie.content
            ? fullMovie.content.replace(/<[^>]*>?/gm, '').trim()
            : 'Bộ phim hấp dẫn với nhiều tình tiết gay cấn, lôi cuốn người xem.';

          let reply = `🎬 **Thông tin phim: ${fullMovie.name}** ${fullMovie.origin_name ? `(${fullMovie.origin_name})` : ''}\n\n`;
          reply += `• **Năm phát hành**: ${fullMovie.year || 'Mới cập nhật'}\n`;
          reply += `• **Chất lượng**: ${fullMovie.quality || 'FHD'} - ${fullMovie.lang || 'Vietsub'}\n`;
          if (fullMovie.category && fullMovie.category.length > 0) {
            reply += `• **Thể loại**: ${fullMovie.category.map((c: any) => c.name).join(', ')}\n`;
          }
          if (fullMovie.actor && fullMovie.actor.length > 0) {
            reply += `• **Diễn viên**: ${fullMovie.actor.slice(0, 5).join(', ')}\n`;
          }
          reply += `\n📖 **Tóm tắt cốt truyện:**\n${cleanDesc}\n\n👉 Bạn có thể bấm vào nút bên dưới để xem phim ngay nhé!`;

          return NextResponse.json({
            content: reply,
            recommendations: [
              { name: `▶️ Xem "${fullMovie.name}"`, slug: `phim/${fullMovie.slug}` },
            ],
            source: 'lphim-nlp-movie-summary',
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // D. MOOD / GENRE / COUNTRY RECOMMENDATIONS (Tư vấn theo tâm trạng, thể loại)
    // -------------------------------------------------------------------------
    const moodMap: Record<string, { desc: string; genre: string }> = {
      buồn: { desc: 'để giải tỏa nỗi buồn và nạp lại năng lượng tích cực', genre: 'hai-huoc' },
      buon: { desc: 'để giải tỏa nỗi buồn và nạp lại năng lượng tích cực', genre: 'hai-huoc' },
      'thất tình': { desc: 'để chữa lành trái tim và thư giãn tâm hồn', genre: 'tinh-cam' },
      'that tinh': { desc: 'để chữa lành trái tim và thư giãn tâm hồn', genre: 'tinh-cam' },
      'căng thẳng': { desc: 'giúp bạn xả stress và cười thả ga', genre: 'hai-huoc' },
      'cang thang': { desc: 'giúp bạn xả stress và cười thả ga', genre: 'hai-huoc' },
      stress: { desc: 'giúp bạn xả stress cực kỳ hiệu quả', genre: 'hai-huoc' },
      vui: { desc: 'khuấy động thêm không khí vui tươi, phấn khởi', genre: 'hai-huoc' },
      'hồi hộp': { desc: 'đầy kịch tính, nghẹt thở từ đầu tới cuối', genre: 'hanh-dong' },
      'hoi hop': { desc: 'đầy kịch tính, nghẹt thở từ đầu tới cuối', genre: 'hanh-dong' },
      'sợ hãi': { desc: 'rùng rợn, giật gân thách thức lòng can đảm', genre: 'kinh-di' },
      'so hai': { desc: 'rùng rợn, giật gân thách thức lòng can đảm', genre: 'kinh-di' },
    };

    let matchedMoodInfo: { desc: string; genre: string } | null = null;
    for (const [mKw, mVal] of Object.entries(moodMap)) {
      if (lower.includes(mKw)) {
        matchedMoodInfo = mVal;
        break;
      }
    }

    const genreKeywords: Record<string, string> = {
      'hành động': 'hanh-dong',
      'hanh dong': 'hanh-dong',
      action: 'hanh-dong',
      'tình cảm': 'tinh-cam',
      'tinh cam': 'tinh-cam',
      'lãng mạn': 'tinh-cam',
      'ngôn tình': 'tinh-cam',
      'hài hước': 'hai-huoc',
      'hai huoc': 'hai-huoc',
      hài: 'hai-huoc',
      'cổ trang': 'co-trang',
      'co trang': 'co-trang',
      'kiếm hiệp': 'co-trang',
      'kinh dị': 'kinh-di',
      'kinh di': 'kinh-di',
      ma: 'kinh-di',
      'hoạt hình': 'hoat-hinh',
      'hoat hinh': 'hoat-hinh',
      anime: 'anime',
      'viễn tưởng': 'vien-tuong',
      'khoa học': 'khoa-hoc',
      'tâm lý': 'tam-ly',
      'hình sự': 'hinh-su',
      'trinh thám': 'hinh-su',
      'chiến tranh': 'chien-tranh',
      'võ thuật': 'vo-thuat',
    };

    const countryKeywords: Record<string, string> = {
      'hàn quốc': 'han-quoc',
      'han quoc': 'han-quoc',
      korea: 'han-quoc',
      'trung quốc': 'trung-quoc',
      'trung quoc': 'trung-quoc',
      china: 'trung-quoc',
      'nhật bản': 'nhat-ban',
      'nhat ban': 'nhat-ban',
      japan: 'nhat-ban',
      'âu mỹ': 'au-my',
      'au my': 'au-my',
      mỹ: 'au-my',
      hollywood: 'au-my',
      'thái lan': 'thai-lan',
      'thai lan': 'thai-lan',
      'việt nam': 'viet-nam',
      'viet nam': 'viet-nam',
      'ấn độ': 'an-do',
    };

    let matchedGenreSlug = matchedMoodInfo ? matchedMoodInfo.genre : '';
    if (!matchedGenreSlug) {
      for (const [kw, slug] of Object.entries(genreKeywords)) {
        if (lower.includes(kw)) {
          matchedGenreSlug = slug;
          break;
        }
      }
    }

    let matchedCountrySlug = '';
    for (const [kw, slug] of Object.entries(countryKeywords)) {
      if (lower.includes(kw)) {
        matchedCountrySlug = slug;
        break;
      }
    }

    let movieSearchResult = null;

    if (matchedGenreSlug) {
      movieSearchResult = await getMoviesByGenre(matchedGenreSlug, 1);
    } else if (matchedCountrySlug) {
      movieSearchResult = await getMoviesByCountry(matchedCountrySlug, 1);
    } else if (lower.includes('phim bộ') || lower.includes('phim bo') || lower.includes('series')) {
      movieSearchResult = await getMoviesByType('phim-bo', 1);
    } else if (lower.includes('phim lẻ') || lower.includes('phim le') || lower.includes('chiếu rạp')) {
      movieSearchResult = await getMoviesByType('phim-le', 1);
    } else if (lower.includes('hoạt hình') || lower.includes('anime')) {
      movieSearchResult = await getMoviesByType('hoat-hinh', 1);
    } else {
      // Clean query and search by keyword
      const cleanKeyword = userQuery
        .replace(/^(gợi ý|tìm|xem|muốn xem|có phim|cho tôi|phim gì|tư vấn|bạn có biết|cho xin|hỏi về)\s*/gi, '')
        .trim();

      if (cleanKeyword.length >= 2) {
        movieSearchResult = await searchMovies(cleanKeyword, 6);
      }
      if (!movieSearchResult || !movieSearchResult.data?.items?.length) {
        movieSearchResult = await getLatestMovies(1);
      }
    }

    const items = movieSearchResult?.data?.items || [];
    const topMovies = items.slice(0, 4);

    let replyContent = '';
    const recommendations: { name: string; slug: string }[] = [];

    if (topMovies.length > 0) {
      if (matchedMoodInfo) {
        replyContent = `Dưới đây là các bộ phim tuyệt vời **${matchedMoodInfo.desc}** dành riêng cho bạn:\n\n`;
      } else {
        replyContent = `Dưới đây là danh sách các bộ phim cực hay và chất lượng trên LPhim theo yêu cầu **"${userQuery}"** của bạn:\n\n`;
      }

      topMovies.forEach((m: any, idx: number) => {
        replyContent += `🎬 **${idx + 1}. ${m.name}** ${m.origin_name ? `(${m.origin_name})` : ''}\n`;
        replyContent += `• **Thông tin**: ${m.quality || 'FHD'} - ${m.lang || 'Vietsub'} ${m.year ? `• Năm: ${m.year}` : ''} ${m.episode_current ? `• ${m.episode_current}` : ''}\n`;
        if (m.content) {
          const shortDesc = m.content.replace(/<[^>]*>?/gm, '').slice(0, 110);
          replyContent += `• **Nội dung**: ${shortDesc}...\n`;
        }
        replyContent += `\n`;

        recommendations.push({
          name: m.name,
          slug: `phim/${m.slug}`,
        });
      });

      replyContent += `👉 Bạn có thể bấm trực tiếp vào các nút phim bên dưới để xem ngay lập tức nhé!`;
    } else {
      replyContent = `Chào bạn! Đối với câu hỏi **"${userQuery}"**, bạn có thể tham khảo các danh mục phim hot nhất hiện nay trên LPhim hoặc nhập từ khóa cụ thể (tên phim, tên diễn viên) để mình tìm kiếm chính xác nhất cho bạn nhé!`;
      recommendations.push(
        { name: '🔥 Top Phim Mới Nhất', slug: 'danh-sach/phim-moi-cap-nhat' },
        { name: '🎬 Phim Chiếu Rạp', slug: 'the-loai/hanh-dong' },
        { name: '🇰🇷 Phim Hàn Quốc', slug: 'quoc-gia/han-quoc' },
        { name: '🎭 Phim Bộ Hay', slug: 'danh-sach/phim-bo' }
      );
    }

    return NextResponse.json({
      content: replyContent,
      recommendations,
      source: 'lphim-nlp-engine',
    });
  } catch (err: any) {
    console.error('AI API Route Error:', err);
    return NextResponse.json(
      {
        content: 'Rất tiếc, đã có sự cố kết nối. Bạn hãy thử lại hoặc thử tìm kiếm phim trên thanh tìm kiếm nhé!',
        recommendations: [
          { name: 'Khám Phá Phim Mới', slug: 'danh-sach/phim-moi-cap-nhat' },
          { name: 'Phim Bộ Hot', slug: 'danh-sach/phim-bo' },
        ],
      },
      { status: 200 }
    );
  }
}
