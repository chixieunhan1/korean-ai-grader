'use client'

import { useMemo, useState } from 'react'

type GradeResponse = {
  nhan_xet_chung: string
  annotated_html: string
  tu_vung_ngu_phap: string
  lap_luan_mach_lac: string
  bai_viet_de_xuat: string
}

type Tab = {
  key: keyof GradeResponse
  label: string
}

const tabs: Tab[] = [
  { key: 'nhan_xet_chung', label: 'Nhận xét chung' },
  { key: 'tu_vung_ngu_phap', label: 'Từ vựng & Ngữ pháp' },
  { key: 'lap_luan_mach_lac', label: 'Lập luận & Mạch lạc' },
  { key: 'bai_viet_de_xuat', label: 'Bài viết đề xuất' },
]

export default function HomePage() {
  const [text, setText] = useState('')
  const [active, setActive] =
    useState<keyof GradeResponse>('nhan_xet_chung')
  const [result, setResult] =
    useState<GradeResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const disabled = useMemo(
    () => loading || text.trim().length < 20,
    [loading, text]
  )

  const onGrade = async () => {
    setLoading(true)

    const response = await fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writing: text }),
    })

    const data = await response.json()

    setResult(data)
    setActive('nhan_xet_chung')
    setLoading(false)
  }

  return (
    <main className="page">

      {/* HEADER */}
      <section className="hero">

        <div className="hero-left">

          <div className="logo">
            🤖
          </div>

          <div>
            <h1 className="title">
              Trợ lí AI của chixieunhan
            </h1>

            <p className="subtitle">
              Trợ lí AI chấm bài viết tiếng Hàn cho người học TOPIK
            </p>

            <div className="chips">
              <span className="chip">TOPIK</span>
              <span className="chip">AI Grading</span>
              <span className="chip">Writing</span>
            </div>

          </div>
        </div>

        {/* SCORE */}
        <div className="scores">

          <div className="scoreCard">
            <div className="scoreLabel">
              Từ vựng
            </div>
            <div className="scoreValue">
              --
            </div>
          </div>

          <div className="scoreCard">
            <div className="scoreLabel">
              Ngữ pháp
            </div>
            <div className="scoreValue">
              --
            </div>
          </div>

          <div className="scoreCard">
            <div className="scoreLabel">
              Mạch lạc
            </div>
            <div className="scoreValue">
              --
            </div>
          </div>

          <div className="scoreCard">
            <div className="scoreLabel">
              Tổng quan
            </div>
            <div className="scoreValue">
              --
            </div>
          </div>

        </div>

      </section>


      {/* INPUT */}
      <section className="card input-card">

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập bài viết của học sinh..."
          className="writer"
        />

        <button
          onClick={onGrade}
          disabled={disabled}
          className="grade-btn"
        >
          {loading ? 'Đang chấm...' : 'Chấm bài'}
        </button>

      </section>


      {/* RESULT */}
      {result && (

        <section className="card result-card">

          <div className="tabs">

            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={
                  active === tab.key
                    ? 'tab active'
                    : 'tab'
                }
              >
                {tab.label}
              </button>
            ))}

          </div>

          <div className="panel">

            {active === 'tu_vung_ngu_phap' && (

              <div className="annotated">

                <div
                  dangerouslySetInnerHTML={{
                    __html: result.annotated_html,
                  }}
                />

                <p className="legend">
                  <span className="err">Sai</span>
                  <span className="arrow">→</span>
                  <span className="fix">Sửa đúng</span>
                </p>

                <p>{result.tu_vung_ngu_phap}</p>

              </div>

            )}

            {active !== 'tu_vung_ngu_phap' && (
              <p>{result[active]}</p>
            )}

          </div>

        </section>

      )}
    </main>
  )
}
