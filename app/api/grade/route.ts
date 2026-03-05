import { NextResponse } from 'next/server';

type GradePayload = {
  loai_cau: '53' | '54';
  topik_score: { content: number; organization: number; language: number; total: number };

  nhan_xet_chung: string;
  annotated_html: string;
  tu_vung_ngu_phap: string;

  loi_tu_vung: Array<{ wrong: string; fix: string; explain_vi: string }>;
  loi_ngu_phap: Array<{ wrong: string; fix: string; explain_vi: string }>;

  lap_luan_mach_lac: string;
  bai_viet_de_xuat: string;
};

const systemPrompt = `Bạn là giáo viên tiếng Hàn dạy cho người Việt với hơn 10 năm kinh nghiệm.
Bạn chuyên luyện thi và chấm bài viết TOPIK cho các trình độ TOPIK cấp 3, 4, 5, 6.

Ưu tiên phát hiện càng nhiều lỗi càng tốt, kể cả lỗi nhỏ về:
- khoảng cách từ (띄어쓰기)
- tiểu từ (조사)
- cách dùng từ tự nhiên
- cấu trúc câu

Hãy phản hồi bằng tiếng Việt, rõ ràng, chi tiết, mang tính hướng dẫn để học sinh cải thiện.

Bắt buộc trả về DUY NHẤT JSON hợp lệ với đúng các key sau:
{
  "loai_cau": "53" | "54",
  "topik_score": { "content": number, "organization": number, "language": number, "total": number },

  "nhan_xet_chung": string,
  "annotated_html": string,
  "tu_vung_ngu_phap": string,

  "loi_tu_vung": [{ "wrong": string, "fix": string, "explain_vi": string }],
  "loi_ngu_phap": [{ "wrong": string, "fix": string, "explain_vi": string }],

  "lap_luan_mach_lac": string,
  "bai_viet_de_xuat": string
}

Quy tắc chấm theo TOPIK:
- Nếu loai_cau = 53: chấm theo thang (내용/과제수행 7) + (구성 7) + (언어 16) = 30.
- Nếu loai_cau = 54: chấm theo thang (내용/과제수행 12) + (구성 12) + (언어 26) = 50.
- Cho điểm từng mục và tổng điểm.

Yêu cầu nội dung từng phần:
1) nhan_xet_chung: 5–8 câu, nêu điểm mạnh, điểm yếu, và 3 ưu tiên cải thiện rõ ràng.
2) annotated_html:
- Giữ nguyên bài gốc nhiều nhất có thể.
- Chỉ đánh dấu chỗ sai bằng HTML inline đúng format:
  <span class="err">từ sai</span><span class="arrow">→</span><span class="fix">từ sửa</span>
- Không dùng markdown, không thêm script/style.
3) tu_vung_ngu_phap: giữ phần nhận xét tổng quan (1 đoạn) như hiện tại, viết dễ hiểu.
4) loi_tu_vung: liệt kê lỗi từ vựng/띄어쓰기/collocation… (càng nhiều càng tốt). Mỗi lỗi có wrong/fix/explain_vi (giải thích ngắn gọn).
5) loi_ngu_phap: liệt kê lỗi ngữ pháp/조사/đuôi câu/cấu trúc… (càng nhiều càng tốt). Mỗi lỗi có wrong/fix/explain_vi.
6) lap_luan_mach_lac: 6–10 câu, chỉ ra vấn đề logic, liên kết, thứ tự ý; gợi ý cách chia đoạn.
7) bai_viet_de_xuat:
- Viết lại một bài mới tốt hơn dựa trên nền bài của học sinh.
- Giữ ý chính nhưng diễn đạt tự nhiên, mạch lạc, đúng phong cách TOPIK.
- Nếu loai_cau=53: khoảng 200–300 chữ (tương đối).
- Nếu loai_cau=54: khoảng 600–700 chữ (tương đối).`;

function extractJson(text: string): GradePayload {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as GradePayload;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return valid JSON.');
    return JSON.parse(match[0]) as GradePayload;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { writing?: string; loai_cau?: '53' | '54' };

    const writing = body.writing ?? '';
    const loai_cau: '53' | '54' = body.loai_cau ?? '54';

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
          {
            role: 'user',
            content: `Loại câu TOPIK: ${loai_cau}\n\nHãy chấm bài viết sau:\n\n${writing}`,
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const details = await openaiRes.text();
      return NextResponse.json({ error: `OpenAI API error: ${details}` }, { status: 500 });
    }

    const data = (await openaiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'Không nhận được nội dung phản hồi từ AI.' }, { status: 500 });
    }

    const payload = extractJson(content);

    // đảm bảo loai_cau trong payload luôn có
    payload.loai_cau = payload.loai_cau ?? loai_cau;

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
