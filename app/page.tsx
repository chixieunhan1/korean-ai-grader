'use client';

import { useMemo, useState } from 'react';

type GradeResponse = {
  loai_cau?: '53' | '54';
  topik_score?: { content: number; organization: number; language: number; total: number };

  nhan_xet_chung: string;
  annotated_html: string;
  tu_vung_ngu_phap: string;
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
  const [question, setQuestion] = useState<QuestionMode>('auto');

  const disabled = useMemo(() => loading || text.trim().length < 20, [loading, text]);

  const onGrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      {/* HEADER */}
      <header className="hero card">
        <div className="heroTop">
          <div className="brand">
            <div className="logoDot" aria-hidden />
            <div>
              <h1 className="heroTitle">Trợ lí AI Chixieunhan</h1>
              <p className="heroSub">
                Chấm & sửa bài viết tiếng Hàn theo tiêu chí TOPIK — phát hiện lỗi nhỏ (띄어쓰기, 조사, 표현 자연스러움) và gợi ý bài viết hay hơn.
              </p>
            </div>
          </div>

          <div className="controls">
            <div className="control">
              <div className="controlLabel">Chọn dạng bài</div>
              <select
                className="select"
                value={question}
                onChange={(e) => setQuestion(e.target.value as QuestionMode)}
              >
                <option value="auto">Tự nhận diện</option>
                <option value="53">Câu 53 (200–300자)</option>
                <option value="54">Câu 54 (600–700자)</option>
              </select>
            </div>

            {result?.topik_score ? (
              <div className="scoreCard">
                <div className="scoreTitle">TOPIK Score</div>
                <div className="scoreGrid">
                  <div className="scoreItem">
                    <div className="scoreK">Nội dung</div>
                    <div className="scoreV">{result.topik_score.content}</div>
                  </div>
                  <div className="scoreItem">
                    <div className="scoreK">Bố cục</div>
                    <div className="scoreV">{result.topik_score.organization}</div>
                  </div>
                  <div className="scoreItem">
                    <div className="scoreK">Ngôn ngữ</div>
                    <div className="scoreV">{result.topik_score.language}</div>
                  </div>
                  <div className="scoreItem total">
                    <div className="scoreK">Tổng</div>
                    <div className="scoreV">{result.topik_score.total}</div>
                  </div>
                </div>

                {result.loai_cau ? (
                  <div className="scoreNote">AI đang chấm theo: Câu {result.loai_cau}</div>
                ) : null}
              </div>
            ) : (
              <div className="tipCard">
                <div className="tipTitle">Mẹo nhanh</div>
                <div className="tipText">
                  Dán bài → bấm <b>Chấm bài</b> → xem từng tab. Phần “Từ vựng & Ngữ pháp” sẽ có sửa trực tiếp + tổng kết lỗi.
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* INPUT */}
      <section className="card input-card mintBorder">
        <div className="inputHeader">
          <div className="inputTitle">Bài viết của học viên</div>
          <div className="pill">{text.trim().length} ký tự</div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Dán bài viết tiếng Hàn vào đây..."
          className="writer"
        />

        <div className="action-row">
          <button onClick={onGrade} disabled={disabled} className="grade-btn mintBtn">
            {loading ? 'Đang chấm...' : 'Chấm bài'}
          </button>
          <span className="hint">Tối thiểu 20 ký tự để bắt đầu chấm.</span>
          {error && <span className="error-msg">{error}</span>}
        </div>
      </section>

      {/* RESULT */}
      {result && (
        <section className="card result-card mintBorder">
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
                <div className="annotatedBox" dangerouslySetInnerHTML={{ __html: result.annotated_html }} />

                <div className="legend">
                  <span className="err">Sai</span>
                  <span className="arrow">→</span>
                  <span className="fix">Sửa đúng</span>
                </div>

                <div className="noteBox">{result.tu_vung_ngu_phap}</div>

                {(result.loi_tu_vung?.length || result.loi_ngu_phap?.length) ? (
                  <div className="twoCols">
                    <div className="listCard">
                      <div className="listTitle">Lỗi từ vựng</div>
                      {result.loi_tu_vung?.length ? (
                        <ul className="list">
                          {result.loi_tu_vung.map((x, i) => (
                            <li key={i}>
                              <b>{x.wrong}</b> → <b>{x.fix}</b>
                              <div className="explain">{x.explain_vi}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="empty">Chưa có dữ liệu lỗi từ vựng.</div>
                      )}
                    </div>

                    <div className="listCard">
                      <div className="listTitle">Lỗi ngữ pháp</div>
                      {result.loi_ngu_phap?.length ? (
                        <ul className="list">
                          {result.loi_ngu_phap.map((x, i) => (
                            <li key={i}>
                              <b>{x.wrong}</b> → <b>{x.fix}</b>
                              <div className="explain">{x.explain_vi}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="empty">Chưa có dữ liệu lỗi ngữ pháp.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="noteBox">{(result as any)[active]}</div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
