import { NextResponse } from 'next/server';

type Issue = {
  sai: string;        // trích phần sai (ngắn)
  sua: string;        // sửa đúng
  giai_thich: string; // giải thích ngắn
};

type GradePayload = {
  nhan_xet_chung: string;
  annotated_html: string;
  tu_vung_ngu_phap: string; // nhận xét ngắn cho tab này
  loi_tu_vung: Issue[];
  loi_ngu_phap: Issue[];
  lap_luan_mach_lac: string;
  bai_viet_de_xuat: string; // viết lại toàn bài
};

const systemPrompt = `Bạn là giáo viên tiếng Hàn dạy cho người Việt với hơn 10 năm kinh nghiệm, chuyên chấm bài viết TOPIK (cấp 3–6).
Hãy chấm và phản hồi bằng tiếng Việt, theo tiêu chí TOPIK: từ vựng, ngữ pháp, mạch lạc, liên kết ý, diễn đạt tự nhiên.

ƯU TIÊN phát hiện CÀNG NHIỀU lỗi càng tốt, kể cả lỗi nhỏ về:
- khoảng cách từ (띄어쓰기)
- tiểu từ (이/가, 을/를, 에/에서, 도/만, 은/는...)
- cách dùng từ tự nhiên/collocation
- cấu trúc câu, đuôi câu, liên kết câu

TRẢ VỀ DUY NHẤT 1 JSON HỢP LỆ, đúng chính xác các key sau:
{
  "nhan_xet_chung": "Nhận xét tổng quan (5-8 câu). Có: điểm tốt, điểm cần cải thiện, gợi ý ưu tiên sửa gì trước.",
  "annotated_html": "Bài gốc đã đánh dấu lỗi bằng span class (xem quy tắc dưới).",
  "tu_vung_ngu_phap": "Nhận xét ngắn cho tab này (1-3 câu) + nhắc lỗi phổ biến nhất.",
  "loi_tu_vung": [
    { "sai": "...", "sua": "...", "giai_thich": "..." }
  ],
  "loi_ngu_phap": [
    { "sai": "...", "sua": "...", "giai_thich": "..." }
  ],
  "lap_luan_mach_lac": "Nhận xét về cấu trúc, liên kết ý, logic, ví dụ. (5-8 câu) + gợi ý bố cục viết lại.",
  "bai_viet_de_xuat": "Viết lại TOÀN BỘ bài (mạch lạc hơn, tự nhiên hơn) dựa trên ý gốc của học sinh."
}

YÊU CẦU BẮT BUỘC:
- "loi_tu_vung" và "loi_ngu_phap" phải có càng nhiều mục càng tốt. Nếu bài có lỗi, cố gắng >= 8 mục mỗi phần (hoặc tối đa có thể).
- Mỗi mục: sai/sửa ngắn gọn, giải thích 1-2 câu, dễ hiểu cho người Việt.
- Nếu là lỗi 띄어쓰기: sai="...", sửa="...", giải thích nêu quy tắc tách/ghép.
- Nếu là lỗi tiểu từ: nêu vì sao chọn 이/가, 을/를, 에/에서...
- Nếu là lỗi diễn đạt: đưa phương án tự nhiên hơn.

QUY TẮC annotated_html:
- Giữ nguyên văn bản gốc nhiều nhất có thể.
- Chỉ đánh dấu lỗi bằng HTML inline đúng mẫu:
  <span class="err">từ sai</span><span class="arrow">→</span><span class="fix">từ sửa</span>
- Cho phép xuống dòng bằng <br>.
- Không dùng markdown.
- Không thêm bất kỳ thẻ khác (không a, không img, không div, không script/style).`;

function extractJson(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return valid JSON.');
    return JSON.parse(match[0]);
  }
}

/**
 * Sanitizer tối giản để tránh model chèn HTML lạ.
 * Chỉ cho phép <span class="err|fix|arrow"> và <br>.
 */
function sanitizeAnnotatedHtml(input: string): string {
  let html = input ?? '';

  // 1) Xóa mọi tag KHÔNG phải span/br
  html = html.replace(/<(?!\/?(span|br)\b)[^>]*>/gi, '');

  // 2) Với <span ...> chỉ cho phép class err/fix/arrow, bỏ hết attr khác
  html = html.replace(/<span\b([^>]*)>/gi, (full, attrs) => {
    const m = String(attrs).match(/\bclass\s*=\s*["']([^"']+)["']/i);
    const cls = (m?.[1] ?? '').trim();
    const allowed = ['err', 'fix', 'arrow'];
    const picked = allowed.includes(cls) ? cls : '';
    return picked ? `<span class="${picked}">` : `<span>`;
  });

  // 3) Loại bỏ </br> (nếu có)
  html = html.replace(/<\/br>/gi, '');

  return html;
}

function normalizePayload(raw: any): GradePayload {
  const safeText = (v: any, fallback = '') => (typeof v === 'string' ? v : fallback);

  const safeIssueArray = (v: any): Issue[] => {
    if (!Array.isArray(v)) return [];
    return v
      .map((it) => ({
        sai: typeof it?.sai === 'string' ? it.sai : '',
        sua: typeof it?.sua === 'string' ? it.sua : '',
        giai_thich: typeof it?.giai_thich === 'string' ? it.giai_thich : '',
      }))
      .filter((it) => it.sai || it.sua || it.giai_thich);
  };

  return {
    nhan_xet_chung: safeText(raw?.nhan_xet_chung),
    annotated_html: sanitizeAnnotatedHtml(safeText(raw?.annotated_html)),
    tu_vung_ngu_phap: safeText(raw?.tu_vung_ngu_phap),
    loi_tu_vung: safeIssueArray(raw?.loi_tu_vung),
    loi_ngu_phap: safeIssueArray(raw?.loi_ngu_phap),
    lap_luan_mach_lac: safeText(raw?.lap_luan_mach_lac),
    bai_viet_de_xuat: safeText(raw?.bai_viet_de_xuat),
  };
}

export async function POST(req: Request) {
  try {
    const { writing } = (await req.json()) as { writing?: string };

    if (!writing || writing.trim().length < 20) {
      return NextResponse.json({ error: 'Bài viết quá ngắn.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Thiếu OPENAI_API_KEY trong biến môi trường.' }, { status: 500 });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Hãy chấm bài viết sau (giữ đúng schema JSON đã yêu cầu):\n\n${writing}` },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const details = await openaiRes.text();
      return NextResponse.json({ error: `OpenAI API error: ${details}` }, { status: 500 });
    }

    const data = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Không nhận được nội dung phản hồi từ AI.' }, { status: 500 });
    }

    const raw = extractJson(content);
    const payload = normalizePayload(raw);

    // Nếu model “lười” trả ít lỗi, vẫn trả về nhưng bạn sẽ thấy ít mục.
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
