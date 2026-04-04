function matMul(a, b) {
  const rows = a.length, inner = b.length, cols = b[0].length;
  const out = Array.from({length: rows}, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++)
    for (let k = 0; k < inner; k++)
      for (let j = 0; j < cols; j++)
        out[i][j] += a[i][k] * b[k][j];
  return out;
}

function renderMatrix(m, label) {
  const size = `${m.length}\u00d7${m[0].length}`;
  let html = `<strong>${label}</strong> (${size})<br><table style="border-collapse:collapse;display:inline-table;margin:0.25rem 0;">`;
  for (const row of m) {
    html += '<tr>';
    for (const v of row) {
      html += `<td style="border:1px solid var(--md-default-fg-color--lighter,#ccc);padding:4px 8px;text-align:center;">${v}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

async function initSSE() {
  // Only run on the SSE explorer page
  const btn = document.getElementById('run-btn');
  if (!btn) return;

  const { default: init, search_sse } = await import('../wasm/sse_core.js');
  await init();

  btn.addEventListener('click', () => {
    const v = id => parseInt(document.getElementById(id).value) || 0;
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<em>Searching...</em>';

    setTimeout(() => {
      try {
        const json = search_sse(
          v('a00'), v('a01'), v('a10'), v('a11'),
          v('b00'), v('b01'), v('b10'), v('b11'),
          v('max-lag'), v('max-dim'), v('max-entry')
        );
        const res = JSON.parse(json);

        if (res.status === 'equivalent') {
          let html = '<div style="padding:1rem;border-left:4px solid #4caf50;background:var(--md-code-bg-color,#f5f5f5);margin:0.5rem 0;">';
          html += `<strong>Equivalent!</strong> Found a path with ${res.steps.length} elementary step(s).<br><br>`;

          for (let i = 0; i < res.steps.length; i++) {
            const s = res.steps[i];
            const uv = matMul(s.u, s.v);
            const vu = matMul(s.v, s.u);
            html += `<div style="margin-bottom:1rem;">`;
            html += `<strong>Step ${i + 1}:</strong> UV = A<sub>${i}</sub>, VU = A<sub>${i + 1}</sub><br>`;
            html += `<div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:start;">`;
            html += renderMatrix(s.u, 'U');
            html += renderMatrix(s.v, 'V');
            html += renderMatrix(uv, 'UV');
            html += renderMatrix(vu, 'VU');
            html += `</div></div>`;
          }
          html += '</div>';
          resultDiv.innerHTML = html;
        } else if (res.status === 'not_equivalent') {
          resultDiv.innerHTML = `<div style="padding:1rem;border-left:4px solid #f44336;background:var(--md-code-bg-color,#f5f5f5);"><strong>Not equivalent:</strong> ${res.reason}</div>`;
        } else {
          resultDiv.innerHTML = `<div style="padding:1rem;border-left:4px solid #ff9800;background:var(--md-code-bg-color,#f5f5f5);"><strong>Unknown:</strong> Search exhausted without finding a path or proving non-equivalence. Try increasing the search parameters.</div>`;
        }
      } catch (e) {
        resultDiv.innerHTML = `<div style="color:red;">Error: ${e.message}</div>`;
      }
    }, 10);
  });
}

initSSE();
