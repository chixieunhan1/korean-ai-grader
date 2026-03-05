'use client';

import { useMemo, useState } from 'react';

type GradeResponse = {
  loai_cau?: '53' | '54';
  topik_score?: { content: number; organization: number; language: number; total: number };

  nhan_xet_chung: string;
  annotated_html: string;
  tu_vung_ngu_phap: string;
  // nếu bạn đã thêm các mảng lỗi:
  loi_tu_vung?: Array<{ wrong: string; fix: string; explain_vi: string }>;
  loi_ngu_phap?: Array<{ wrong: string; fix: string; explain_vi: string }>;

  lap_luan_mach_lac: string;
  bai_viet_de_xuat: string;
};

type Tab = {
  key: keyof GradeResponse;
  label: string;
};

const tabs: Tab[] = [
  { key: 'nhan_xet_chung', label: 'Nhận xét chung' },
  { key: 'tu_vung_ngu_phap', label: 'Từ vựng & Ngữ pháp' },
  { key: 'lap_luan_mach_lac', label: 'Lập luận & Mạch lạc' },
  { key: 'bai_viet_de_xuat', label: 'Bài viết đề xuất' },
];

type QuestionMode = 'auto' | '53' | '54';

export default function HomePage() {
  const [text, setText] = useState('');
  const [active, setActive] = useState<keyof GradeResponse>('nhan_xet_chung');
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ NEW: chọn câu
  const [question, setQuestion] = useState<QuestionMode>('auto');

  const disabled = useMemo(() => loading || text.trim().length < 20, [loading, text]);

  const onGrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ NEW: gửi thêm question
        body: JSON.stringify({ writing: text, question }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? 'Không thể chấm bài.');
      }

      const data = (await response.json()) as GradeResponse;
      setResult(data);
      setActive('nhan_xet_chung');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="card input-card">
        <h1>Trợ lí AI Chixieunhan</h1>
        <p className="subtitle">Dán bài viết TOPIK và nhấn “Chấm bài” để nhận phản hồi chi tiết.</p>

        {/* ✅ NEW: dropdown chọn câu */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <label style={{ fontWeight: 600, color: '#374151' }}>Chọn dạng bài:</label>
          <select
            value={question}
            onChange={(e) => setQuestion(e.target.value as QuestionMode)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#fff',
            }}
          >
            <option value="auto">Tự nhận diện</option>
            <option value="53">Câu 53 (200–300 chữ)</option>
            <option value="54">Câu 54 (600–700 chữ)</option>
          </select>

          {result?.loai_cau && (
            <span style={{ marginLeft: 8, color: '#0f766e', fontWeight: 700 }}>
              AI đang chấm: Câu {result.loai_cau}
            </span>
          )}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập bài viết của học sinh..."
          className="writer"
        />

        <div className="action-row">
          <button onClick={onGrade} disabled={disabled} className="grade-btn">
            {loading ? 'Đang chấm...' : 'Chấm bài'}
          </button>
          <span className="hint">Tối thiểu 20 ký tự để bắt đầu chấm.</span>
        </div>

        {error && <p className="error-msg">{error}</p>}
      </section>

      {result && (
        <section className="card result-card">
          <div className="tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={active === tab.key ? 'tab active' : 'tab'}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="panel">
            {active === 'tu_vung_ngu_phap' ? (
              <div className="annotated">
                <div dangerouslySetInnerHTML={{ __html: result.annotated_html }} />
                <p className="legend">
                  <span className="err">Sai</span>
                  <span className="arrow">→</span>
                  <span className="fix">Sửa đúng</span>
                </p>

                <p>{result.tu_vung_ngu_phap}</p>

                {/* ✅ NEW: nếu có mảng lỗi thì hiển thị thêm */}
                {result.loi_tu_vung?.length ? (
                  <div style={{ marginTop: 14 }}>
                    <h3 style={{ margin: '6px 0' }}>Lỗi từ vựng</h3>
                    {result.loi_tu_vung.map((x, i) => (
                      <p key={i}>
                        <b>{x.wrong}</b> → <b>{x.fix}</b>: {x.explain_vi}
                      </p>
                    ))}
                  </div>
                ) : null}

                {result.loi_ngu_phap?.length ? (
                  <div style={{ marginTop: 14 }}>
                    <h3 style={{ margin: '6px 0' }}>Lỗi ngữ pháp</h3>
                    {result.loi_ngu_phap.map((x, i) => (
                      <p key={i}>
                        <b>{x.wrong}</b> → <b>{x.fix}</b>: {x.explain_vi}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p>{(result as any)[active]}</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
