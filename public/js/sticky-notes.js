/* 가운데 화면 위에 겹쳐 그려지는 협의용 스티커 메모 기능입니다. */
(function () {
  const TYPE_ORDER = ['policy', 'dev', 'design'];
  const TYPE_LABEL = { policy: '정책 확인', dev: '개발 협의', design: '디자인 확인' };

  let container = null;
  let typeSelect = null;
  let addBtn = null;
  let hideBtn = null;
  let toastStack = null;

  let placing = false;
  let hidden = false;
  const noteEls = new Map(); // id -> element
  const editingIds = new Set();
  let draggingId = null;
  const saveTimers = new Map(); // id -> timeout handle

  function typeLabel(type) {
    return TYPE_LABEL[type] || type;
  }

  function createNoteElement(note) {
    const el = document.createElement('div');
    el.className = 'sticky-note';
    el.dataset.id = note.id;
    el.dataset.type = note.type;
    el.style.left = note.x + '%';
    el.style.top = note.y + '%';
    el.style.transform = 'rotate(' + note.rotate + 'deg)';

    const head = document.createElement('div');
    head.className = 'sticky-note-head';

    const typeBtn = document.createElement('button');
    typeBtn.type = 'button';
    typeBtn.className = 'sticky-type';
    typeBtn.textContent = typeLabel(note.type);
    typeBtn.addEventListener('click', function () {
      const idx = TYPE_ORDER.indexOf(el.dataset.type);
      const nextType = TYPE_ORDER[(idx + 1) % TYPE_ORDER.length];
      el.dataset.type = nextType;
      typeBtn.textContent = typeLabel(nextType);
      window.NotesStore.updateNote(note.id, { type: nextType }).catch(function (err) {
        console.error(err);
      });
    });

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'sticky-done';
    doneBtn.textContent = '협의 완료';
    doneBtn.addEventListener('click', function () {
      handleDelete(note.id);
    });

    head.appendChild(typeBtn);
    head.appendChild(doneBtn);

    const body = document.createElement('div');
    body.className = 'sticky-body';
    body.contentEditable = 'true';
    body.setAttribute('data-placeholder', '메모를 입력하세요');
    body.textContent = note.content || '';

    body.addEventListener('focus', function () {
      editingIds.add(note.id);
    });

    body.addEventListener('blur', function () {
      editingIds.delete(note.id);
      flushSave(note.id, body.textContent);
    });

    body.addEventListener('input', function () {
      const id = note.id;
      if (saveTimers.has(id)) clearTimeout(saveTimers.get(id));
      const text = body.textContent;
      saveTimers.set(id, setTimeout(function () {
        saveTimers.delete(id);
        window.NotesStore.updateNote(id, { content: text }).catch(function (err) {
          console.error(err);
        });
      }, 500));
    });

    const foot = document.createElement('div');
    foot.className = 'sticky-foot';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'sticky-date';
    dateSpan.textContent = note.date || '';
    const authorSpan = document.createElement('span');
    authorSpan.className = 'sticky-author';
    authorSpan.textContent = '기획';
    foot.appendChild(dateSpan);
    foot.appendChild(authorSpan);

    el.appendChild(head);
    el.appendChild(body);
    el.appendChild(foot);

    bindDrag(el, head, note.id);

    return el;
  }

  function flushSave(id, text) {
    if (saveTimers.has(id)) {
      clearTimeout(saveTimers.get(id));
      saveTimers.delete(id);
    }
    window.NotesStore.updateNote(id, { content: text }).catch(function (err) {
      console.error(err);
    });
  }

  function bindDrag(el, handle, id) {
    handle.addEventListener('mousedown', function (e) {
      if (e.target.closest('button')) return;
      e.preventDefault();
      draggingId = id;
      el.classList.add('dragging');

      const rect = container.getBoundingClientRect();

      function onMove(moveEvt) {
        let xPct = ((moveEvt.clientX - rect.left) / rect.width) * 100;
        let yPct = ((moveEvt.clientY - rect.top) / rect.height) * 100;
        xPct = Math.max(0, Math.min(94, xPct));
        yPct = Math.max(0, Math.min(94, yPct));
        el.style.left = xPct + '%';
        el.style.top = yPct + '%';
        el.dataset.pendingX = xPct;
        el.dataset.pendingY = yPct;
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        el.classList.remove('dragging');
        draggingId = null;
        const x = parseFloat(el.dataset.pendingX);
        const y = parseFloat(el.dataset.pendingY);
        if (!isNaN(x) && !isNaN(y)) {
          window.NotesStore.updateNote(id, { x: x, y: y }).catch(function (err) {
            console.error(err);
          });
        }
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function handleDelete(id) {
    const el = noteEls.get(id);
    const data = window.NotesStore.current().find(function (n) { return n.id === id; });
    if (el) {
      el.remove();
      noteEls.delete(id);
    }
    window.NotesStore.removeNote(id).catch(function (err) {
      console.error(err);
    });
    if (data) showUndoToast(data);
  }

  function showUndoToast(note) {
    const toast = document.createElement('div');
    toast.className = 'undo-toast';

    const text = document.createElement('span');
    text.className = 'undo-toast-text';
    text.textContent = typeLabel(note.type) + ' 메모가 삭제되었습니다.';

    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'undo-toast-btn';
    undoBtn.textContent = '되돌리기';

    let timer = setTimeout(function () {
      toast.remove();
    }, 6000);

    undoBtn.addEventListener('click', function () {
      clearTimeout(timer);
      toast.remove();
      window.NotesStore.restoreNote(note).catch(function (err) {
        console.error(err);
      });
    });

    toast.appendChild(text);
    toast.appendChild(undoBtn);
    toastStack.appendChild(toast);
  }

  function render(notes) {
    if (!container) return;
    const mine = notes.filter(function (n) { return n.screen === window.CURRENT_SCREEN; });
    const seen = new Set();

    mine.forEach(function (note) {
      seen.add(note.id);
      let el = noteEls.get(note.id);

      if (!el) {
        el = createNoteElement(note);
        noteEls.set(note.id, el);
        container.appendChild(el);
        return;
      }

      if (draggingId === note.id || editingIds.has(note.id)) return;

      el.dataset.type = note.type;
      el.style.left = note.x + '%';
      el.style.top = note.y + '%';
      el.style.transform = 'rotate(' + note.rotate + 'deg)';

      const typeBtn = el.querySelector('.sticky-type');
      if (typeBtn) typeBtn.textContent = typeLabel(note.type);

      const body = el.querySelector('.sticky-body');
      if (body && document.activeElement !== body && body.textContent !== (note.content || '')) {
        body.textContent = note.content || '';
      }

      const dateSpan = el.querySelector('.sticky-date');
      if (dateSpan) dateSpan.textContent = note.date || '';
    });

    noteEls.forEach(function (el, id) {
      if (!seen.has(id)) {
        el.remove();
        noteEls.delete(id);
        editingIds.delete(id);
      }
    });
  }

  function startPlacing() {
    placing = true;
    container.classList.add('placing');
    addBtn.classList.add('active');
    addBtn.textContent = '위치를 클릭하세요 (Esc 취소)';
  }

  function stopPlacing() {
    placing = false;
    container.classList.remove('placing');
    addBtn.classList.remove('active');
    addBtn.textContent = '+ 메모 붙이기';
  }

  function onContainerClick(e) {
    if (!placing) return;
    if (e.target.closest('.sticky-note')) return;

    const rect = container.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(94, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(94, ((e.clientY - rect.top) / rect.height) * 100));
    const type = typeSelect.value;

    stopPlacing();

    window.NotesStore.createNote({
      screen: window.CURRENT_SCREEN,
      type: type,
      x: xPct,
      y: yPct,
      content: '',
    }).then(function (note) {
      requestAnimationFrame(function () {
        const el = noteEls.get(note.id);
        if (el) {
          const body = el.querySelector('.sticky-body');
          if (body) body.focus();
        }
      });
    }).catch(function (err) {
      console.error(err);
    });
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && placing) {
      stopPlacing();
    }
  }

  function toggleHidden() {
    hidden = !hidden;
    container.classList.toggle('notes-hidden', hidden);
    hideBtn.textContent = hidden ? '메모 보이기' : '메모 숨기기';
  }

  document.addEventListener('DOMContentLoaded', function () {
    container = document.getElementById('screenContainer');
    typeSelect = document.getElementById('noteTypeSelect');
    addBtn = document.getElementById('addNoteBtn');
    hideBtn = document.getElementById('toggleHideBtn');

    if (!container || !window.NotesStore) return;

    toastStack = document.createElement('div');
    toastStack.className = 'undo-toast-stack';
    document.body.appendChild(toastStack);

    addBtn.addEventListener('click', function () {
      if (placing) {
        stopPlacing();
      } else {
        startPlacing();
      }
    });

    hideBtn.addEventListener('click', toggleHidden);
    container.addEventListener('click', onContainerClick);
    document.addEventListener('keydown', onKeydown);

    window.NotesStore.subscribe(render);
  });
})();
