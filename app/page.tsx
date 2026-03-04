function parseSections(text: string) {
  // Expect format:
  // [Tóm tắt]
  // ...
  // [Lỗi từ vựng]
  // - ...
  // [Lỗi ngữ pháp]
  // - ...
  const lines = (text ?? '').split('\n');

  const sections: Array<{ title: string; body: string[] }> = [];
  let current: { title: string; body: string[] } | null = null;

  const isHeader = (l: string) => /^\s*\[[^\]]+\]\s*$/.test(l);

  for (const raw of lines) {
    const line = raw.replace(/\r/g, '');
    if (isHeader(line)) {
      if (current) sections.push(current);
      current = { title: line.trim(), body: [] };
      continue;
    }
    if (!current) current = { title: '[Nội dung]', body: [] };
    current.body.push(line);
  }
  if (current) sections.push(current);

  // Clean trailing empty lines
  for (const s of sections) {
    while (s.body.length && s.body[s.body.length - 1].trim() === '') s.body.pop();
    while (s.body.length && s.body[0].trim() === '') s.body.shift();
  }

  return sections;
}

function renderSectionBody(bodyLines: string[]) {
  // turn "- item" into <li>, keep other lines as paragraphs
  const items: string[] = [];
  const paras: string[] = [];

  for (const l of bodyLines) {
    const line = l.trim();
    if (!line) continue;
    if (line.startsWith('- ')) items.push(line.slice(2).trim());
    else paras.push(line);
  }

  return (
    <>
      {paras.length > 0 && (
        <div className="sec-paras">
          {paras.map((p, idx) => (
            <p key={idx} className="sec-para">
              {p}
            </p>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <ul className="sec-list">
          {items.map((it, idx) => (
            <li key={idx}>{it}</li>
          ))}
        </ul>
      )}
    </>
  );
}
