/* 좌측 인덱스, 우측 화면설명/남은 메모 패널을 그리고 연동합니다. */
(function () {
  const TYPE_LABEL = { policy: '정책 확인', dev: '개발 협의', design: '디자인 확인' };

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function renderIndex() {
    const panel = document.getElementById('indexPanel');
    if (!panel) return;
    const meta = window.PROJECT_META || {};
    const currentId = window.CURRENT_SCREEN;
    const groups = [
      { key: 'customer', label: '고객사 화면' },
      { key: 'admin', label: '슈퍼어드민 · 플렉스지 내부용', sa: true },
    ];

    let html = ''
      + '<div class="index-header">'
      + '<div class="index-project">' + escapeHtml(meta.name) + '</div>'
      + '<div class="index-version">' + escapeHtml(meta.version) + '</div>'
      + '</div>'
      + '<div class="index-list">';

    groups.forEach(function (g) {
      const items = (window.SCREENS || []).filter(function (s) { return s.group === g.key; });
      if (!items.length) return;
      html += '<div class="index-group-label' + (g.sa ? ' admin' : '') + '">'
        + escapeHtml(g.label)
        + (g.sa ? '<span class="sa-tag">SA</span>' : '')
        + '</div>';
      items.forEach(function (s) {
        const isActive = s.id === currentId;
        html += '<a class="index-item' + (isActive ? ' active' : '') + '" href="' + s.file + '" data-screen="' + s.id + '">'
          + '<span class="index-item-label"><span class="code">' + s.code + '</span>' + escapeHtml(s.name) + '</span>'
          + '<span class="badge empty" data-count-for="' + s.id + '"></span>'
          + '</a>';
      });
    });

    html += '</div>'
      + '<div class="index-footer"><span class="pending-count">협의 대기 메모 0건</span></div>';

    panel.innerHTML = html;
  }

  function updateIndexCounts(notes) {
    const byScreen = {};
    notes.forEach(function (n) {
      byScreen[n.screen] = (byScreen[n.screen] || 0) + 1;
    });
    let total = 0;
    (window.SCREENS || []).forEach(function (s) {
      const count = byScreen[s.id] || 0;
      total += count;
      const el = document.querySelector('[data-count-for="' + s.id + '"]');
      if (!el) return;
      if (count > 0) {
        el.textContent = String(count);
        el.classList.remove('empty');
      } else {
        el.textContent = '';
        el.classList.add('empty');
      }
    });
    const pendingEl = document.querySelector('.pending-count');
    if (pendingEl) pendingEl.textContent = '협의 대기 메모 ' + total + '건';
  }

  function renderDescPanel() {
    const panel = document.getElementById('descPanel');
    if (!panel) return;
    const info = window.SCREEN_INFO || { descriptions: [] };

    let html = ''
      + '<div class="desc-tabs">'
      + '<button class="desc-tab active" data-tab="desc" type="button">화면설명</button>'
      + '<button class="desc-tab" data-tab="memo" type="button">남은 메모</button>'
      + '</div>'
      + '<div class="desc-panel-body">'
      + '<div class="desc-tab-content" data-tab-content="desc">';

    info.descriptions.forEach(function (d) {
      html += '<div class="desc-item" data-desc-num="' + d.no + '">'
        + '<span class="desc-num">' + d.no + '</span>'
        + '<div class="desc-item-body">'
        + '<div class="desc-item-name">' + escapeHtml(d.name) + '</div>'
        + '<div class="desc-item-text">' + escapeHtml(d.desc) + '</div>'
        + '</div></div>';
    });

    html += '</div>'
      + '<div class="desc-tab-content" data-tab-content="memo" hidden>'
      + '<div class="memo-remain-list"></div>'
      + '</div></div>';

    panel.innerHTML = html;

    panel.querySelectorAll('.desc-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        panel.querySelectorAll('.desc-tab').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        panel.querySelectorAll('.desc-tab-content').forEach(function (c) {
          c.hidden = c.dataset.tabContent !== btn.dataset.tab;
        });
      });
    });

    panel.querySelectorAll('.desc-item').forEach(function (item) {
      item.addEventListener('click', function () {
        const num = item.getAttribute('data-desc-num');
        const target = document.querySelector('.screen-container .desc-num[data-num="' + num + '"]');
        if (!target) return;
        target.classList.remove('flash');
        requestAnimationFrame(function () { target.classList.add('flash'); });
        setTimeout(function () { target.classList.remove('flash'); }, 1000);
      });
    });
  }

  function renderMemoTab(notes) {
    const list = document.querySelector('[data-tab-content="memo"] .memo-remain-list');
    if (!list) return;
    const mine = notes.filter(function (n) { return n.screen === window.CURRENT_SCREEN; });

    if (!mine.length) {
      list.innerHTML = '<div class="memo-empty">남은 메모가 없습니다. 이 화면의 협의가 모두 완료되었습니다.</div>';
      return;
    }

    list.innerHTML = mine.map(function (n) {
      return '<div class="memo-remain-item" data-goto="' + n.id + '">'
        + '<span class="memo-remain-type" data-type="' + n.type + '">' + (TYPE_LABEL[n.type] || n.type) + '</span>'
        + '<span class="memo-remain-date">' + escapeHtml(n.date) + '</span>'
        + '<div class="memo-remain-text">' + escapeHtml((n.content || '').slice(0, 40)) + '</div>'
        + '</div>';
    }).join('');

    list.querySelectorAll('.memo-remain-item').forEach(function (item) {
      item.addEventListener('click', function () {
        const id = item.getAttribute('data-goto');
        const note = document.querySelector('.sticky-note[data-id="' + id + '"]');
        if (!note) return;
        note.scrollIntoView({ behavior: 'smooth', block: 'center' });
        note.classList.remove('flash');
        requestAnimationFrame(function () { note.classList.add('flash'); });
        setTimeout(function () { note.classList.remove('flash'); }, 1000);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderIndex();
    renderDescPanel();

    if (window.NotesStore) {
      window.NotesStore.subscribe(function (notes) {
        updateIndexCounts(notes);
        renderMemoTab(notes);
      });
      window.NotesStore.startPolling();
    }
  });
})();
