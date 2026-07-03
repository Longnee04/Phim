import https from 'https';

const callGeminiHttps = (apiVersion, modelName, apiKey, systemInstruction, message) => {
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
            path: `/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`,
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

    const preferredModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    const systemInstruction = 
        "Bạn là Trợ lý AI thông minh của LPhim (website xem phim trực tuyến miễn phí). " +
        "Nhiệm vụ của bạn là tư vấn, gợi ý các bộ phim hay nhất, mới nhất thế giới dựa trên thể loại, tâm trạng, quốc gia hoặc danh sách phim của diễn viên do người dùng yêu cầu. " +
        "Hãy nói chuyện ngắn gọn, tự nhiên và thân thiện bằng Tiếng Việt. " +
        "Đặc biệt, ở cuối câu trả lời của bạn, hãy luôn kèm theo một dòng chứa chính xác định dạng JSON sau để hệ thống tự động liên kết nút xem phim: " +
        "\\n[MOVIES: [\\\"Tên Phim 1\\\", \\\"Tên Phim 2\\\"]]\\n" +
        "Ví dụ: Nếu gợi ý phim của Tom Cruise, hãy kết thúc bằng: [MOVIES: [\\\"Mission: Impossible - Dead Reckoning\\\", \\\"Top Gun: Maverick\\\"]]. Hãy ghi chính xác tên tiếng Việt hoặc tên tiếng Anh phổ biến nhất của phim.";

    // Danh sách các tổ hợp API và Model sẽ thử nghiệm tuần tự nếu gặp lỗi
    const attempts = [
        { apiVersion: 'v1beta', model: preferredModel },
        { apiVersion: 'v1beta', model: 'gemini-2.0-flash' },
        { apiVersion: 'v1', model: 'gemini-1.5-flash' },
        { apiVersion: 'v1beta', model: 'gemini-1.5-pro' }
    ];

    let lastError = null;

    for (let i = 0; i < attempts.length; i++) {
        const attempt = attempts[i];
        
        // Tránh chạy trùng lặp nếu preferredModel đã là gemini-2.0-flash hoặc gemini-1.5-flash
        if (i > 0 && attempt.model === preferredModel && attempt.apiVersion === 'v1beta') {
            continue;
        }

        try {
            console.log(`Trying Gemini call: API Version=${attempt.apiVersion}, Model=${attempt.model}...`);
            const result = await callGeminiHttps(attempt.apiVersion, attempt.model, apiKey, systemInstruction, message);
            
            if (result.ok) {
                const data = JSON.parse(result.text);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                return res.status(200).json({ reply: text });
            } else {
                let currentError = `Model ${attempt.model} on ${attempt.apiVersion} failed`;
                try {
                    const parsed = JSON.parse(result.text);
                    if (parsed.error && parsed.error.message) {
                        currentError = parsed.error.message;
                    }
                } catch (e) {
                    currentError = result.text || currentError;
                }
                console.warn(`Attempt ${i + 1} failed:`, currentError);
                lastError = currentError;
            }
        } catch (err) {
            console.error(`Attempt ${i + 1} exception:`, err);
            lastError = err.message || err;
        }
    }

    // Nếu tất cả các cách đều thất bại, trả về lỗi chi tiết cuối cùng
    return res.status(502).json({ error: lastError || 'All Gemini API call attempts failed' });
}
