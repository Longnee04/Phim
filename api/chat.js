import https from 'https';

const callGeminiHttps = (modelName, apiKey, systemInstruction, message) => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
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
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    statusCode: res.statusCode,
                    text: data
                });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
};

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

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    const systemInstruction = 
        "Bạn là Trợ lý AI thông minh của LPhim (website xem phim trực tuyến miễn phí). " +
        "Nhiệm vụ của bạn là tư vấn, gợi ý các bộ phim hay nhất, mới nhất thế giới dựa trên thể loại, tâm trạng, quốc gia hoặc danh sách phim của diễn viên do người dùng yêu cầu. " +
        "Hãy nói chuyện ngắn gọn, tự nhiên và thân thiện bằng Tiếng Việt. " +
        "Đặc biệt, ở cuối câu trả lời của bạn, hãy luôn kèm theo một dòng chứa chính xác định dạng JSON sau để hệ thống tự động liên kết nút xem phim: " +
        "\\n[MOVIES: [\\\"Tên Phim 1\\\", \\\"Tên Phim 2\\\"]]\\n" +
        "Ví dụ: Nếu gợi ý phim của Tom Cruise, hãy kết thúc bằng: [MOVIES: [\\\"Mission: Impossible - Dead Reckoning\\\", \\\"Top Gun: Maverick\\\"]]. Hãy ghi chính xác tên tiếng Việt hoặc tên tiếng Anh phổ biến nhất của phim.";

    try {
        let result = await callGeminiHttps(model, apiKey, systemInstruction, message);

        // Fallback to gemini-1.5-flash if the custom model fails
        if (!result.ok && model !== 'gemini-1.5-flash') {
            console.log('Attempting fallback to gemini-1.5-flash...');
            result = await callGeminiHttps('gemini-1.5-flash', apiKey, systemInstruction, message);
        }

        if (!result.ok) {
            let errorMessage = 'Google Gemini API returned an error';
            try {
                const parsedError = JSON.parse(result.text);
                if (parsedError.error && parsedError.error.message) {
                    errorMessage = parsedError.error.message;
                }
            } catch (e) {
                errorMessage = result.text || errorMessage;
            }
            return res.status(502).json({ error: errorMessage });
        }

        const data = JSON.parse(result.text);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.status(200).json({ reply: text });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message || error });
    }
}
