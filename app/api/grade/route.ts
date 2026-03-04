import { NextResponse } from 'next/server';

type GradePayload = {
  nhan_xet_chung: string;
  annotated_html: string;
  tu_vung_ngu_phap: string;
  lap_luan_mach_lac: string;
  bai_viet_de_xuat: string;
};

const systemPrompt = `Bạn là giáo viên tiếng Hàn. Hãy chấm và phản hồi bằng tiếng Việt.
Trả về DUY NHẤT JSON hợp lệ với các key:
{
  "nhan_xet_chung": "...",
  "annotated_html": "...",
  "tu_vung_ngu_phap": "...",
  "lap_luan_mach_lac": "...",
  "bai_viet_de_xuat": "..."
}

Quy tắc annotated_html:
- Giữ nguyên văn bản gốc nhiều nhất có thể.
- Chỉ đánh dấu lỗi bằng HTML inline:
  <span class="err">từ sai</span><span class="arrow">→</span><span class="fix">từ sửa</span>
- Không dùng markdown.
- Không thêm script/style.`;

function extractJson(text: string): GradePayload {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as GradePayload;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Model did not return valid JSON.');
    }
    return JSON.parse(match[0]) as GradePayload;
  }
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
          {
            role: 'user',
            content: `Hãy chấm bài viết sau:\n\n${writing}`,
          },
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

    const payload = extractJson(content);

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
