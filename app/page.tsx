'use client';

import { useMemo, useState } from 'react';

type Issue = {
  sai: string;
  sua: string;
  giai_thich: string;
};

type GradeResponse = {
  nhan_xet_chung: string;
  annotated_html: string;
  tu_vung_ngu_phap: string;
  loi_tu_vung: Issue[];
  loi_ngu_phap: Issue[];
  lap_luan_mach_lac: string;
  bai_viet_de_xuat: string;
};

type Tab = {
  key: keyof Omit<GradeResponse, 'annotated_html' | 'loi_tu_vung' | 'loi_ngu_phap'>;
  label: string;
};

const tabs: Tab[] = [
  { key: 'nhan_xet_chung', label: 'Nhận xét chung' },
  { key: 'tu_vung_ngu_phap', label: 'Từ vựng & Ngữ pháp' },
  { key: 'lap_luan_mach_lac', label: 'Lập luận & Mạch lạc' },
  { key: 'bai_viet_de_xuat', label: 'Bài viết đề xuất' },
];

function IssueList({ title, items }: { title: string; items: Issue[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="issue-block">
      <h3 className="issue-title">{title}</h3>
      <ul className="issue-list">
        {items.map((it, idx) => (
          <li key={idx} className="issue-item">
            <div className="issue-head">
              <span className="err">{it.sai}</span>
              <span className="arrow">→</span>
              <span className="fix">{it.sua}</span>
            </div>
            <div className="issue-explain">{it.giai_thich}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  const [text, setText] = useState('');
  const [active, setActive] = useState<Tab['key']>('nhan_xet_chung');
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = useMemo(() => loading || text.trim().length < 20, [loading, text]);

  const onGrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writing: text }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? 'Không thể chấm bài.');
      }

      const data = (await response.json()) as GradeResponse;

      // fallback nếu thiếu
      data.loi_tu_vung = Array.isArray(data.loi_tu_vung) ? data.loi_tu_vung : [];
      data.loi_ngu_phap = Array.isArray(data.loi_ngu_phap) ? data.loi_ngu_phap : [];

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
        <h1>Korean Writing Grader</h1>
        <p className="subtitle">Dán bài viết tiếng Hàn và nhấn “Chấm bài” để nhận phản hồi chi tiết.</p>

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

                {/* Tổng kết ngắn như cũ */}
                <p>{result.tu_vung_ngu_phap}</p>

                {/* PHẦN BẠN MUỐN THÊM (giống hình 2) */}
                <IssueList title="Lỗi từ vựng" items={result.loi_tu_vung} />
                <IssueList title="Lỗi ngữ pháp" items={result.loi_ngu_phap} />
              </div>
            ) : (
              <p>{result[active]}</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
