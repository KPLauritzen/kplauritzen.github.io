# SSE Explorer

Check whether two 2x2 nonnegative integer matrices are **Strong Shift Equivalent** (SSE).

Two matrices A and B are SSE if there exists a finite chain of elementary steps connecting them,
where each step involves factorisations A = UV, B = VU with nonneg integer entries.

NOTE: This is an early work-in-progress. So far we only support 2x2, 3x2, and 2x3 intermediate factorisations. 

<div id="sse-app">
  <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 1rem;">
    <div>
      <strong>Matrix A</strong>
      <table style="border-collapse: collapse;">
        <tr>
          <td><input type="number" id="a00" value="1" min="0" style="width:60px;text-align:center;"></td>
          <td><input type="number" id="a01" value="1" min="0" style="width:60px;text-align:center;"></td>
        </tr>
        <tr>
          <td><input type="number" id="a10" value="2" min="0" style="width:60px;text-align:center;"></td>
          <td><input type="number" id="a11" value="5" min="0" style="width:60px;text-align:center;"></td>
        </tr>
      </table>
    </div>
    <div>
      <strong>Matrix B</strong>
      <table style="border-collapse: collapse;">
        <tr>
          <td><input type="number" id="b00" value="1" min="0" style="width:60px;text-align:center;"></td>
          <td><input type="number" id="b01" value="2" min="0" style="width:60px;text-align:center;"></td>
        </tr>
        <tr>
          <td><input type="number" id="b10" value="1" min="0" style="width:60px;text-align:center;"></td>
          <td><input type="number" id="b11" value="5" min="0" style="width:60px;text-align:center;"></td>
        </tr>
      </table>
    </div>
  </div>

  <details style="margin-bottom: 1rem;">
    <summary>Search parameters</summary>
    <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem;">
      <label>Max lag: <input type="number" id="max-lag" value="4" min="1" max="10" style="width:60px;"></label>
      <label>Max intermediate dim: <input type="number" id="max-dim" value="3" min="2" max="5" style="width:60px;"></label>
      <label>Max entry: <input type="number" id="max-entry" value="25" min="1" max="100" style="width:60px;"></label>
    </div>
  </details>

  <button id="run-btn" style="padding: 0.5rem 1.5rem; font-size: 1rem; cursor: pointer;">Check SSE</button>

  <div id="result" style="margin-top: 1rem;"></div>
</div>
