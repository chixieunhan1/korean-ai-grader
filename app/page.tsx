'use client';

import { useMemo, useState } from 'react';

type GradeResponse = {
  nhan_xet_chung: string;
  annotated_html: string;
  tu_vung_ngu_phap: string;

  // OPTIONAL: nếu sau này bạn trả thêm 2 phần này từ API thì UI sẽ tự hiện đẹp
  loi_tu_vung?: string;   // có thể là text dài
  loi_ngu_phap?: string;  // có thể là text dài

  lap_luan_mach_lac: string;
  bai_viet_de_xuat: string;
};

type TabKey = 'nhan_xet_chung' | 'tu_vung_ngu_phap' | 'lap_luan_mach_lac' | 'bai_viet_de_xuat';

const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'nhan_xet_chung', label: 'Nhận xét chung', icon: '🧾' },
  { key: 'tu_vung_ngu_phap', label: 'Từ vựng & Ngữ pháp', icon: '🧠' },
  { key: 'lap_luan_mach_lac', label: 'Lập luận & Mạch lạc', icon: '🧩' },
  { key: 'bai_viet_de_xuat', label: 'Bài viết đề xuất', icon: '✨' },
];

function countWords(text: string) {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export default function HomePage() {
  const [text, setText] = useState('');
  const [active, setActive] = useState<TabKey>('nhan_xet_chung');
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chars = text.length;
  const words = useMemo(() => countWords(text), [text]);

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
        const err = await response.json().catch(() => ({}));
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
    <main className="mint-app">
      <header className="mint-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div className="brand-text">
            <h1>Korean Writing Grader</h1>
            <p>Chấm bài viết tiếng Hàn theo hướng TOPIK — phát hiện lỗi nhỏ & gợi ý sửa tự nhiên.</p>
          </div>
        </div>

        <div className="header-actions">
          <a className="ghost-link" href="https://platform.openai.com/usage" target="_blank" rel="noreferrer">
            Usage ↗
          </a>
        </div>
      </header>

      <section className="mint-grid">
        {/* LEFT: input */}
        <section className="mint-card mint-input">
          <div className="card-head">
            <div>
              <h2>Nhập bài viết</h2>
              <p className="muted">Dán bài viết của học sinh vào ô bên dưới (tối thiểu 20 ký tự).</p>
            </div>

            <div className="chips">
              <span className="chip">
                <span className="chip-dot" /> Chars: <b>{chars}</b>
              </span>
              <span className="chip">
                <span className="chip-dot" /> Words: <b>{words}</b>
              </span>
            </div>
          </div>

          <div className="textarea-wrap">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ví dụ: 저는 작년 여름에 제주도에 여행을 갔습니다..."
              className="mint-textarea"
            />
            <div className="textarea-footer">
              <span className="hint">
                Tip: Bạn có thể dán cả đoạn dài. AI sẽ ưu tiên bắt lỗi khoảng cách từ, tiểu từ, dùng từ tự nhiên, cấu trúc câu.
              </span>
            </div>
          </div>

          <div className="actions">
            <button onClick={onGrade} disabled={disabled} className="mint-btn">
              {loading ? (
                <>
                  <span className="spinner" aria-hidden /> Đang chấm...
                </>
              ) : (
                <>
                  <span className="spark" aria-hidden /> Chấm bài
                </>
              )}
            </button>

            <button
              className="mint-btn secondary"
              onClick={() => {
                setText('');
                setResult(null);
                setError(null);
              }}
              disabled={loading && !!result}
              title="Xoá nội dung"
            >
              Làm mới
            </button>
          </div>

          {error && (
            <div className="alert">
              <div className="alert-title">Có lỗi xảy ra</div>
              <div className="alert-body">{error}</div>
            </div>
          )}
        </section>

        {/* RIGHT: results */}
        <section className="mint-card mint-result">
          <div className="card-head">
            <div>
              <h2>Kết quả</h2>
              <p className="muted">Xem theo từng tab. Tab “Từ vựng & Ngữ pháp” có highlight trực tiếp trên bài.</p>
            </div>
            <div className="status-pill" data-ready={!!result}>
              {result ? 'Ready' : 'Chưa có kết quả'}
            </div>
          </div>

          {!result ? (
            <div className="empty">
              <div className="empty-emoji">🍃</div>
              <div className="empty-title">Chưa có bài nào được chấm</div>
              <div className="empty-sub">Dán bài viết rồi bấm “Chấm bài” để nhận phản hồi.</div>
            </div>
          ) : (
            <>
              <div className="tabs">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActive(t.key)}
                    className={active === t.key ? 'tab active' : 'tab'}
                  >
                    <span className="tab-ico" aria-hidden>
                      {t.icon}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="panel">
                {active === 'tu_vung_ngu_phap' ? (
                  <div className="tu-nguphap">
                    <div className="section-title">
                      <span className="badge">Highlight</span>
                      <h3>Bài viết đã đánh dấu lỗi</h3>
                    </div>

                    <div className="paper">
                      <div className="paper-inner" dangerouslySetInnerHTML={{ __html: result.annotated_html }} />
                      <div className="legend">
                        <span className="err">Sai</span>
                        <span className="arrow">→</span>
                        <span className="fix">Sửa đúng</span>
                      </div>
                    </div>

                    <div className="split">
                      <div className="box">
                        <div className="box-head">
                          <h4>Nhận xét (tổng hợp)</h4>
                          <p className="muted">Tóm tắt nhanh lỗi nổi bật + cách tránh lặp lại.</p>
                        </div>
                        <div className="box-body">{result.tu_vung_ngu_phap}</div>
                      </div>

                      <div className="box">
                        <div className="box-head">
                          <h4>Lỗi từ vựng & Lỗi ngữ pháp</h4>
                          <p className="muted">
                            (Tuỳ chọn) Nếu API trả thêm <code>loi_tu_vung</code> / <code>loi_ngu_phap</code> thì sẽ hiện ở đây.
                          </p>
                        </div>
                        <div className="box-body">
                          <div className="sublist">
                            <div className="sublist-title">Lỗi từ vựng</div>
                            <div className="sublist-body">{result.loi_tu_vung ?? '—'}</div>
                          </div>
                          <div className="sublist">
                            <div className="sublist-title">Lỗi ngữ pháp</div>
                            <div className="sublist-body">{result.loi_ngu_phap ?? '—'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-block">
                    <div className="section-title">
                      <span className="badge">Feedback</span>
                      <h3>{tabs.find((x) => x.key === active)?.label}</h3>
                    </div>
                    <div className="text-content">{result[active]}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </section>

      <footer className="mint-footer">
        <span>Mint UI • optimized for long Korean essays</span>
      </footer>
    </main>
  );
}
