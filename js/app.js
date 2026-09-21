/* =====================================================================
   곤 투모로우 정산판 — 동작
   ===================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'gt2026-settlement-v1';
  const SHOWS = SCHEDULE.filter(r => !r.off);
  const ROLE_IDX = Object.fromEntries(ROLES.map((r, i) => [r.key, i]));
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- 상태 ---------------- */
  let state = { version: 1, seats: {}, updatedAt: null };
  const selected = new Set();          // 'roleKey:actor'
  const missingImg = new Set();        // 없는 사진 경로 (재요청 방지)

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
          state.seats = cleanSeats((obj.seats && typeof obj.seats === 'object') ? obj.seats : {});
          state.updatedAt = obj.updatedAt || null;
        }
      }
    } catch (e) { /* 저장소 사용 불가 — 메모리로만 동작 */ }
  }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      state.updatedAt = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        const t = new Date();
        $('#save-state').textContent = '저장됨 ' + t.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch (e) {
        $('#save-state').textContent = '이 브라우저에는 저장할 수 없습니다 — JSON 저장을 이용하세요';
      }
    }, 250);
  }

  /* ---------------- 좌석 코드 ---------------- */
  // 1F-B-9-8 / 1f b 9 8 / 1층 B구역 9열 8번 등 허용
  const SEAT_RE = /^\s*([12])\s*(?:F|층)?\s*[-\s/·.]*\s*(OP|A|B|C)\s*(?:구역)?\s*[-\s/·.]*\s*(\d{1,2})\s*(?:열)?\s*[-\s/·.]*\s*(\d{1,2})\s*(?:번)?\s*$/i;
  function parseSeat(str) {
    if (!str) return null;
    const m = SEAT_RE.exec(str);
    if (!m) return null;
    const floor = m[1] + 'F', sec = m[2].toUpperCase(), row = +m[3], num = +m[4];
    const section = SEATMAP[floor] && SEATMAP[floor].sections[sec];
    if (!section) return null;
    const r = section.rows[row - 1];
    if (!r || num < 1 || num > r.n) return null;
    return { floor, sec, row, num, key: `${floor}-${sec}-${row}-${num}` };
  }

  /* ---------------- 집계 ---------------- */
  const NO_SEAT = '0000';   // 좌석 미기재: 관람으로 집계되지만 좌석배치도에는 표시하지 않음
  function normalizeSeat(str) {
    const v = (str || '').trim();
    if (!v) return '';
    if (v === NO_SEAT) return NO_SEAT;
    const p = parseSeat(v);
    return p ? p.key : null;          // null = 형식이 틀리거나 없는 좌석
  }
  function attended(id) { return normalizeSeat(state.seats[id]) != null && normalizeSeat(state.seats[id]) !== ''; }
  function cleanSeats(seats) {        // 저장/불러오기 시 유효하지 않은 값 제거
    const out = {};
    Object.entries(seats || {}).forEach(([k, v]) => { const n = normalizeSeat(v); if (n) out[k] = n; });
    return out;
  }

  function computeStats() {
    const perActor = {};   // 'roleKey:actor' -> {total, seen}
    ROLES.forEach(r => r.actors.forEach(a => { perActor[r.key + ':' + a] = { total: 0, seen: 0 }; }));
    const pair = {};       // 'okgyun|jeonghun' -> {total, seen}
    const seatCounts = {};
    let totalSeen = 0;
    for (const s of SHOWS) {
      const seen = attended(s.id);
      if (seen) totalSeen++;
      s.cast.forEach((a, i) => {
        const k = ROLES[i].key + ':' + a;
        perActor[k].total++; if (seen) perActor[k].seen++;
      });
      const pk = s.cast[0] + '|' + s.cast[1];
      pair[pk] = pair[pk] || { total: 0, seen: 0 };
      pair[pk].total++; if (seen) pair[pk].seen++;
      if (seen) {
        const p = parseSeat(state.seats[s.id]);
        if (p) seatCounts[p.key] = (seatCounts[p.key] || 0) + 1;
      }
    }
    const maxCount = Math.max(0, ...Object.values(seatCounts));
    return { perActor, pair, seatCounts, maxCount, totalSeen, totalAll: SHOWS.length };
  }

  /* ---------------- 색 보간 (흰색 → 로고색) ---------------- */
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  const RED = hexToRgb(LOGO_RED);
  function seatColor(count, max) {
    if (count <= 1 || max <= 1) return '#ffffff';
    const t = (count - 1) / (max - 1);            // 0 = 흰색, 1 = 로고색
    const c = [255, 255, 255].map((w, i) => Math.round(w + (RED[i] - w) * t));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /* ---------------- 필터 UI ---------------- */
  function renderFilter() {
    const box = $('#filter-groups');
    let html = '';
    ROLES.forEach(r => {
      html += `<div class="filter-group"><span class="filter-role">${esc(r.name)}</span><div class="filter-chips">`;
      r.actors.forEach(a => {
        const k = r.key + ':' + a;
        html += `<button type="button" class="chip${selected.has(k) ? ' on' : ''}" data-k="${esc(k)}">${esc(a)}</button>`;
      });
      html += '</div></div>';
    });
    html += `<div class="filter-group"><span class="filter-role"></span><div class="filter-chips"><button type="button" class="chip all${selected.size ? '' : ' on'}" data-k="__all">전체 보기</button></div></div>`;
    box.innerHTML = html;
  }

  function visibleRows() {
    if (!selected.size) return SCHEDULE.slice();
    const byRole = {};
    selected.forEach(k => { const [rk, a] = k.split(':'); (byRole[rk] = byRole[rk] || new Set()).add(a); });
    return SCHEDULE.filter(r => !r.off && Object.entries(byRole).every(([rk, set]) => set.has(r.cast[ROLE_IDX[rk]])));
  }

  function renderSummary(stats) {
    const el = $('#filter-summary');
    if (!selected.size) {
      el.innerHTML = `전체 <b>${stats.totalAll}</b>회 중 <b>${stats.totalSeen}</b>회 관람`;
      return;
    }
    const byRole = {};
    selected.forEach(k => { const [rk, a] = k.split(':'); (byRole[rk] = byRole[rk] || []).push(a); });
    const parts = ROLES.filter(r => byRole[r.key]).map(r => byRole[r.key].join(' / '));
    const rows = visibleRows();
    const seen = rows.filter(r => attended(r.id)).length;
    el.innerHTML = `<span class="pair"><b>${parts.map(esc).join(' × ')}</b></span> — 해당 회차 <b>${rows.length}</b>회 중 <b>${seen}</b>회 관람`;
  }

  /* ---------------- 스케줄표 ---------------- */
  const ORDER = Object.fromEntries(SCHEDULE.map((r, i) => [r.id, i]));
  function bandOf(col, id) {
    const i = ORDER[id];
    return BANDS.find(b => b.col === col && i >= ORDER[b.from] && i <= ORDER[b.to]) || null;
  }

  function renderSchedule() {
    const rows = visibleRows();
    // 밴드 셀 계획: rowspan 계산
    const plan = rows.map(() => [null, null]);
    for (const col of [0, 1]) {
      let i = 0;
      while (i < rows.length) {
        const b = bandOf(col, rows[i].id);
        if (!b) { plan[i][col] = { empty: true }; i++; continue; }
        let j = i;
        while (j < rows.length && bandOf(col, rows[j].id) === b) j++;
        plan[i][col] = { band: b, span: j - i };
        for (let k = i + 1; k < j; k++) plan[k][col] = { skip: true };
        i = j;
      }
    }
    const bandCell = p => {
      if (p.skip) return '';
      if (p.empty) return '<td class="band"></td>';
      const label = p.span >= 3 ? esc(p.band.label) : '';
      return `<td class="band" rowspan="${p.span}"><div class="band-in" style="background:${p.band.color}" title="${esc(p.band.label)}"><span>${label}</span></div></td>`;
    };

    let html = '<thead><tr><th class="band"></th><th class="band"></th><th class="date">일정</th>';
    ROLES.forEach(r => { html += `<th class="cast">${esc(r.name)}</th>`; });
    html += '<th class="seat">좌석</th><th class="tags"></th></tr></thead><tbody>';

    rows.forEach((r, idx) => {
      const p = plan[idx];
      if (r.off) {
        html += `<tr class="off">${bandCell(p[0])}${bandCell(p[1])}<td class="cell date"><div class="dt"><span class="d">${esc(r.d)}</span><span class="w">${esc(r.w)}</span></div></td><td class="cell offcell" colspan="${ROLES.length}">공연없음</td><td class="cell seat"></td><td class="tags"></td></tr>`;
        return;
      }
      const seen = attended(r.id);
      const dcls = r.mat ? 'mat' : (r.hol || r.w === '일') ? 'sun' : r.w === '토' ? 'sat' : '';
      html += `<tr data-id="${r.id}" class="${seen ? 'seen' : ''}">${bandCell(p[0])}${bandCell(p[1])}`;
      const val = state.seats[r.id] || '';
      const cls = val.trim() ? (normalizeSeat(val) ? 'filled' : 'invalid') : '';
      const tagsHtml = (r.tags || []).map(t => `<span class="tag" style="background:${TAGS[t].color}">${esc(TAGS[t].label)}</span>`).join('');
      const seatInput = extra => `<input class="seat-input${extra}${cls ? ' ' + cls : ''}" data-id="${r.id}" value="${esc(val)}" placeholder="1F-OP-1-8" autocomplete="off" spellcheck="false">`;
      html += `<td class="cell date ${dcls}"><div class="dt"><span class="d">${esc(r.d)}</span><span class="w">${esc(r.w)}</span><span class="t">${esc(r.t)}</span></div>${tagsHtml ? `<div class="d-tags">${tagsHtml}</div>` : ''}</td>`;
      r.cast.forEach((a, i) => {
        const hit = selected.has(ROLES[i].key + ':' + a);
        let badge = '';
        if (r.first && r.first.includes(i)) badge = '<span class="badge first">첫공</span>';
        else if (r.last && r.last.includes(i)) badge = '<span class="badge last">막공</span>';
        html += `<td class="cell cast${hit ? ' hit' : ''}"><span class="nm">${esc(a)}${badge}</span></td>`;
      });
      html += `<td class="cell seat">${seatInput('')}</td>`;
      html += `<td class="tags">${tagsHtml}</td>`;
      html += '</tr>';
    });
    html += '</tbody>';
    $('#sched').innerHTML = html;
  }

  /* ---------------- 사진 슬롯 ---------------- */
  function photo(src, name) {
    if (missingImg.has(src)) return `<div class="p-photo"><span class="ph">${esc(name)}</span></div>`;
    return `<div class="p-photo"><img src="${src}" alt="" data-src="${src}"><span class="ph">${esc(name)}</span></div>`;
  }
  function bindPhotos(root) {
    $$('.p-photo img', root).forEach(img => {
      const mark = () => { img.parentElement.classList.add('has-img'); };
      if (img.complete && img.naturalWidth > 0) mark();
      else {
        img.addEventListener('load', mark);
        img.addEventListener('error', () => { missingImg.add(img.dataset.src); img.remove(); });
      }
    });
  }
  const countHtml = (seen, total) => `<div class="p-count"><span class="seen${seen ? '' : ' zero'}">${seen}</span><span class="of">/ ${total}</span></div>`;

  /* ---------------- 좌석배치도 SVG ---------------- */
  function seatmapSvg(stats) {
    const S = 10, P = 12, SEC_GAP = 18, FLOOR_GAP = 30, LBL = 26;
    const emptyFill = '#2b2726', emptyStroke = '#4a4443';
    let out = '';
    const drawSection = (floor, secKey, sec, x0, y0) => {
      sec.rows.forEach((row, ri) => {
        let x = x0 + row.start * P;
        for (let n = 1; n <= row.n; n++) {
          const key = `${floor}-${secKey}-${ri + 1}-${n}`;
          const c = stats.seatCounts[key];
          const fill = c ? seatColor(c, stats.maxCount) : emptyFill;
          const stroke = c ? 'rgba(0,0,0,.35)' : emptyStroke;
          out += `<rect x="${x.toFixed(1)}" y="${(y0 + ri * P).toFixed(1)}" width="${S}" height="${S}" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width=".8"/>`;
          x += P;
          if (row.gapAfter && row.gapAfter.includes(n)) x += P / 2;
        }
      });
      return sec.rows.length * P;
    };
    const f1 = SEATMAP['1F'].sections, f2 = SEATMAP['2F'].sections;
    const wA = f1.A.cols * P, wB = f1.B.cols * P, wC = f1.C.cols * P;
    const xA = LBL, xB = xA + wA + SEC_GAP, xC = xB + wB + SEC_GAP;
    const W = xC + wC + 1;     // 오른쪽 여백 없이 → 배치도 오른쪽 끝이 사진 오른쪽 끝과 맞음
    // STAGE
    let y = 0;
    out += `<rect class="stage" x="${xA}" y="${y}" width="${xC + wC - xA}" height="22" rx="2"/>`;
    out += `<text class="stage-t" x="${(xA + xC + wC) / 2}" y="${y + 15}" font-size="10" text-anchor="middle">STAGE</text>`;
    y += 34;
    // 1F : OP (B구역 위, 가운데 정렬)
    const opW = f1.OP.cols * P + P; // gapAfter 여유
    const xOP = xB + (wB - opW) / 2;
    out += `<text class="lbl" x="${xB + wB / 2}" y="${y - 3}" font-size="8" text-anchor="middle">OP</text>`;
    const hOP = drawSection('1F', 'OP', f1.OP, xOP, y);
    y += hOP + 12;
    out += `<text class="lbl" x="${LBL - 8}" y="${y + 10}" font-size="11" text-anchor="end">1F</text>`;
    ['A', 'B', 'C'].forEach((k, i) => {
      const x = [xA, xB, xC][i], w = [wA, wB, wC][i];
      out += `<text class="lbl" x="${x + w / 2}" y="${y - 3}" font-size="8" text-anchor="middle">${k}</text>`;
    });
    const h1 = Math.max(drawSection('1F', 'A', f1.A, xA, y), drawSection('1F', 'B', f1.B, xB, y), drawSection('1F', 'C', f1.C, xC, y));
    y += h1 + FLOOR_GAP;
    // 2F
    out += `<text class="lbl" x="${LBL - 8}" y="${y + 10}" font-size="11" text-anchor="end">2F</text>`;
    ['A', 'B', 'C'].forEach((k, i) => {
      const x = [xA, xB, xC][i], w = [wA, wB, wC][i];
      out += `<text class="lbl" x="${x + w / 2}" y="${y - 3}" font-size="8" text-anchor="middle">${k}</text>`;
    });
    const h2 = Math.max(drawSection('2F', 'A', f2.A, xA, y), drawSection('2F', 'B', f2.B, xB, y), drawSection('2F', 'C', f2.C, xC, y));
    y += h2 + 4;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${y}" width="${W}" height="${y}">${out}</svg>`;
  }

  function legendHtml(stats) {
    const max = stats.maxCount;
    if (max < 1) return '<span><span class="sw" style="background:#fff"></span>1회</span>';
    if (max <= 7) {
      let h = '';
      for (let c = 1; c <= Math.max(max, 2); c++) h += `<span><span class="sw" style="background:${seatColor(c, Math.max(max, 2))}"></span>${c}회</span>`;
      return h;
    }
    return `<span>1회<span class="bar" style="background:linear-gradient(to right,#ffffff,${LOGO_RED})"></span>${max}회</span>`;
  }

  /* ---------------- 정산표 A ---------------- */
  function renderPosterA(stats) {
    const actorHtml = (r, a, i) => {
      const st = stats.perActor[r.key + ':' + a];
      return `<div class="p-actor">${photo(`images/cast/${r.key}-${i + 1}.jpg`, a)}<div class="p-name">${esc(a)}</div>${countHtml(st.seen, st.total)}</div>`;
    };
    const title = name => `<div class="p-group-title"><span>${esc(name)}</span></div>`;
    const group = (r, cls) => `<div class="p-group">${title(r.name)}<div class="p-row ${cls}">${r.actors.map((a, i) => actorHtml(r, a, i)).join('')}</div></div>`;
    const otherActor = (g, a, i, big) =>
      `<div class="p-actor${big ? ' big' : ''}">${photo(`images/cast/${g.key}-${i + 1}.jpg`, a.name)}<div class="p-role">${a.role ? esc(a.role) : ''}</div><div class="p-name">${esc(a.name)}</div></div>`;

    // 1~3줄: 김옥균 / 한정훈 / 고종+이완
    let html = group(ROLES[0], 'main') + group(ROLES[1], 'main');
    html += `<div class="p-row wide">${group(ROLES[2], '')}${group(ROLES[3], '')}</div>`;
    $('#posterA-cast').innerHTML = html;

    // 4줄: 와다 + 종윤, 그 아래 앙상블 12명 + 스윙 (6 / 7)
    const jy = OTHERS[0], ens = OTHERS[1], sw = OTHERS[2];
    const jyHtml = `<div class="p-group">${title(jy.name)}<div class="p-row">${jy.actors.map((a, i) => otherActor(jy, a, i, false)).join('')}</div></div>`;
    let left = `<div class="p-row sub">${group(ROLES[4], '')}${jyHtml}</div>`;
    const people = ens.actors.map((a, i) => otherActor(ens, a, i, false))
      .concat(sw.actors.map((a, i) => otherActor(sw, { name: a.name, role: sw.name }, i, false)));
    const rows = [people.slice(0, 6), people.slice(6)];
    left += `<div class="p-group ens">${title(ens.name)}${rows.map(r => `<div class="p-row">${r.join('')}</div>`).join('')}</div>`;
    const leftEl = $('#posterA-left');
    leftEl.innerHTML = left;
    bindPhotos($('#posterA-cast'));
    bindPhotos(leftEl);
  }

  /* ---------------- 정산표 B (매트릭스) ---------------- */
  function renderPosterB(stats) {
    const ok = ROLES[0], jh = ROLES[1];
    let html = `<div class="m-corner"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="0" x2="100" y2="100" vector-effect="non-scaling-stroke"/></svg><span class="a">${esc(ok.name)}</span><span class="b">${esc(jh.name)}</span></div>`;
    ok.actors.forEach((a, i) => {
      const st = stats.perActor[ok.key + ':' + a];
      html += `<div class="m-colhead">${countHtml(st.seen, st.total)}${photo(`images/cast/${ok.key}-${i + 1}.jpg`, a)}<div class="p-name">${esc(a)}</div></div>`;
    });
    jh.actors.forEach((b, j) => {
      const st = stats.perActor[jh.key + ':' + b];
      html += `<div class="m-rowhead">${photo(`images/cast/${jh.key}-${j + 1}.jpg`, b)}<div class="txt"><div class="p-name">${esc(b)}</div>${countHtml(st.seen, st.total)}</div></div>`;
      ok.actors.forEach(a => {
        const p = stats.pair[a + '|' + b];
        if (!p) html += '<div class="m-cell none"><span class="n">—</span></div>';
        else html += `<div class="m-cell"><span class="n${p.seen ? '' : ' zero'}">${p.seen}</span><span class="t">/ ${p.total}</span></div>`;
      });
    });
    const m = $('#posterB-matrix');
    m.innerHTML = html;
    bindPhotos(m);

    const others = $('#posterB-others');
    others.innerHTML = [ROLES[2], ROLES[3], ROLES[4]].map(r => `<div class="m-other"><div class="role">${esc(r.name)}</div><div class="list">${r.actors.map(a => {
      const st = stats.perActor[r.key + ':' + a];
      return `<div class="row"><span class="nm">${esc(a)}</span>${countHtml(st.seen, st.total)}</div>`;
    }).join('')}</div></div>`).join('');
  }

  /* ---------------- 공통 렌더 ---------------- */
  function renderPosters() {
    const stats = computeStats();
    renderPosterA(stats);
    renderPosterB(stats);
    $$('[data-total-seen]').forEach(el => { el.textContent = stats.totalSeen; });
    $$('[data-total-all]').forEach(el => { el.textContent = stats.totalAll; });
    const svg = seatmapSvg(stats), legend = legendHtml(stats);
    $$('[data-seatmap]').forEach(el => { el.innerHTML = svg; });
    $$('[data-legend]').forEach(el => { el.innerHTML = legend; });
    renderSummary(stats);
    fitPosters();
  }

  /* 페어 정산판: 오른쪽 로고 영역 높이를 표 헤더(사진 줄) 높이와 맞춰 고종 칸이 첫 번째 셀 줄과 같은 높이에서 시작하게 함 */
  function syncPairHeader() {
    const head = $('#posterB .m-head'), col = $('#posterB .m-colhead');
    if (head && col) head.style.height = col.offsetHeight + 'px';
  }

  function fitPosters() {
    syncPairHeader();
    $$('.poster-viewport').forEach(vp => {
      const poster = $('.poster', vp);
      const w = +vp.dataset.w;
      vp.style.width = '';                                   // 사용 가능한 폭을 먼저 재고
      const scale = Math.min(1, vp.clientWidth / w);
      poster.style.transform = `scale(${scale})`;
      vp.style.width = Math.round(w * scale) + 'px';         // 축소된 정산판 폭에 맞춰 가운데 정렬 (margin: 0 auto)
      vp.style.height = Math.ceil(poster.offsetHeight * scale) + 'px';
    });
  }

  /* ---------------- PNG 저장 ---------------- */
  async function exportPoster(id, name, btn) {
    const src = document.getElementById(id);
    btn.disabled = true; const label = btn.textContent; btn.textContent = '생성 중…';
    const holder = document.createElement('div');
    holder.style.cssText = `position:absolute;left:-100000px;top:0;width:${src.offsetWidth}px;`;
    const clone = src.cloneNode(true);
    clone.style.transform = 'none';
    clone.classList.add('exporting');
    holder.appendChild(clone);
    document.body.appendChild(holder);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const canvas = await html2canvas(clone, {
        scale: 2, backgroundColor: '#000000', useCORS: true, logging: false,
        width: src.offsetWidth, height: src.offsetHeight, windowWidth: src.offsetWidth, windowHeight: src.offsetHeight,
      });
      await new Promise(res => canvas.toBlob(blob => { downloadBlob(blob, name + '.png'); res(); }, 'image/png'));
    } catch (e) {
      alert('이미지 생성에 실패했습니다.\n' + (e && e.message ? e.message : e));
    } finally {
      holder.remove();
      btn.disabled = false; btn.textContent = label;
    }
  }
  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ---------------- JSON ---------------- */
  function exportJson() {
    const data = { app: 'gone-tomorrow-2026', version: 1, seats: state.seats, exportedAt: new Date().toISOString() };
    const d = new Date(), ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `곤투모로우-정산-${ymd}.json`);
  }
  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || typeof obj !== 'object' || !obj.seats || typeof obj.seats !== 'object') throw new Error('형식이 맞지 않습니다');
        const cleaned = cleanSeats(obj.seats);
        const n = Object.keys(cleaned).length;
        if (!confirm(`불러온 데이터(관람 ${n}회)로 현재 기록을 덮어씁니다. 계속할까요?`)) return;
        state.seats = cleaned;
        save(); renderSchedule(); renderPosters();
      } catch (e) { alert('JSON을 읽을 수 없습니다: ' + e.message); }
    };
    reader.readAsText(file);
  }

  /* ---------------- 안내 토스트 ---------------- */
  let toastTimer = null;
  function toast(msg) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 3200);
  }

  /* ---------------- 이벤트 ---------------- */
  function bind() {
    $('#filter-groups').addEventListener('click', e => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      const k = btn.dataset.k;
      if (k === '__all') selected.clear();
      else if (selected.has(k)) selected.delete(k); else selected.add(k);
      renderFilter(); renderSchedule(); renderSummary(computeStats());
    });

    const table = $('#sched');
    table.addEventListener('input', e => {
      const inp = e.target.closest('.seat-input'); if (!inp) return;
      const id = inp.dataset.id, v = inp.value;
      if (v.trim()) state.seats[id] = v; else delete state.seats[id];
      const ok = !!normalizeSeat(v);
      const tr = inp.closest('tr');
      tr.classList.toggle('seen', ok);
      $$('.seat-input', tr).forEach(el => {
        if (el !== inp) el.value = v;
        el.classList.toggle('filled', ok);
        el.classList.toggle('invalid', !!v.trim() && !ok);
      });
      save();
      clearTimeout(bind._t); bind._t = setTimeout(renderPosters, 200);
    });
    table.addEventListener('change', e => {
      const inp = e.target.closest('.seat-input'); if (!inp) return;
      const tr = inp.closest('tr'), id = inp.dataset.id;
      const n = normalizeSeat(inp.value);
      if (n) {                                   // 유효한 좌석 또는 0000 → 정리해서 저장
        $$('.seat-input', tr).forEach(el => { el.value = n; el.classList.add('filled'); el.classList.remove('invalid'); });
        state.seats[id] = n; tr.classList.add('seen'); save();
      } else if (n === null) {                   // 형식이 틀리거나 없는 좌석 → 삭제
        const bad = inp.value.trim();
        $$('.seat-input', tr).forEach(el => { el.value = ''; el.classList.remove('filled', 'invalid'); });
        delete state.seats[id]; tr.classList.remove('seen'); save();
        toast(`'${bad}' 은(는) 없는 좌석이라 삭제했습니다. 층-구역-열-번호 (예: 1F-OP-1-8), 좌석 미기재는 0000`);
      }
      clearTimeout(bind._t); bind._t = setTimeout(renderPosters, 100);
    });
    table.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.classList.contains('seat-input')) return;
      const inputs = $$('.seat-input', table).filter(el => el.offsetParent !== null); const i = inputs.indexOf(e.target);
      if (i >= 0 && inputs[i + 1]) { e.preventDefault(); inputs[i + 1].focus(); inputs[i + 1].select(); }
    });

    $('#btn-export').addEventListener('click', exportJson);
    $('#btn-import').addEventListener('click', () => $('#file-import').click());
    $('#file-import').addEventListener('change', e => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });
    $('#btn-reset').addEventListener('click', () => {
      if (!confirm('모든 좌석 기록을 지웁니다. 계속할까요?')) return;
      state.seats = {}; save(); renderSchedule(); renderPosters();
    });
    $$('.poster-toolbar .dl').forEach(btn => btn.addEventListener('click', () => exportPoster(btn.dataset.target, btn.dataset.name, btn)));

    let rt = null;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fitPosters, 80); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPosters);
    window.addEventListener('load', fitPosters);
  }

  /* ---------------- 시작 ---------------- */
  load();
  renderFilter();
  renderSchedule();
  renderPosters();
  bind();
})();
