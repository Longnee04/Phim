export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel' });
    }

    // Default to gemini-1.5-flash (compatible with all free keys)
    // Nếu bạn muốn dùng mô hình khác, bạn chỉ cần set biến GEMINI_MODEL trên Vercel
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    const systemInstruction = 
        "Bạn là Trợ lý AI thông minh của LPhim (website xem phim trực tuyến miễn phí). " +
        "Nhiệm vụ của bạn là tư vấn, gợi ý các bộ phim hay nhất, mới nhất thế giới dựa trên thể loại, tâm trạng, quốc gia hoặc danh sách phim của diễn viên do người dùng yêu cầu. " +
        "Hãy nói chuyện ngắn gọn, tự nhiên và thân thiện bằng Tiếng Việt. " +
        "Đặc biệt, ở cuối câu trả lời của bạn, hãy luôn kèm theo một dòng chứa chính xác định dạng JSON sau để hệ thống tự động liên kết nút xem phim: " +
        "\\n[MOVIES: [\\\"Tên Phim 1\\\", \\\"Tên Phim 2\\\"]]\\n" +
        "Ví dụ: Nếu gợi ý phim của Tom Cruise, hãy kết thúc bằng: [MOVIES: [\\\"Mission: Impossible - Dead Reckoning\\\", \\\"Top Gun: Maverick\\\"]]. Hãy ghi chính xác tên tiếng Việt hoặc tên tiếng Anh phổ biến nhất của phim.";

    const callGemini = async (modelName) => {
        return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: systemInstruction },
                            { text: message }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            })
        });
    };

    try {
        let response = await callGemini(model);

        // Nếu mô hình được chọn bị lỗi (ví dụ gemini-2.5-flash không tồn tại)
        if (!response.ok) {
            const errText = await response.text();
            console.error(`Gemini API error with model ${model}:`, errText);

            // Thử tự động quay về gemini-1.5-flash nếu mô hình tùy chỉnh bị lỗi
            if (model !== 'gemini-1.5-flash') {
                console.log('Attempting fallback to gemini-1.5-flash...');
                response = await callGemini('gemini-1.5-flash');
            }
        }

        // Kiểm tra lại sau khi đã thử fallback
        if (!response.ok) {
            const errText = await response.text();
            let errorMessage = 'Google Gemini API returned an error';
            
            try {
                const parsedError = JSON.parse(errText);
                if (parsedError.error && parsedError.error.message) {
                    errorMessage = parsedError.error.message;
                }
            } catch (e) {
                errorMessage = errText || errorMessage;
            }

            return res.status(502).json({ error: errorMessage });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.status(200).json({ reply: text });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
