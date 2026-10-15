/* 메모 데이터를 서버와 주고받고, 10초마다 폴링하여 구독자에게 전달합니다. */
(function () {
  const API_BASE = '/api/notes';
  const POLL_INTERVAL = 10000;
  // Blob 저장소는 쓰기 직후 바로 읽으면 최신 상태가 아닐 수 있어, 방금 내가 한 작업은
  // 이 시간(ms) 동안 폴링 결과보다 우선합니다. (서버가 따라올 시간을 벌어줌)
  const LOCAL_OVERRIDE_MS = 20000;

  let notes = [];
  let pollTimer = null;
  const listeners = new Set();
  const pending = new Map(); // id -> { op: 'create' | 'update' | 'delete', note?, until }

  function notify() {
    listeners.forEach((fn) => {
      try {
        fn(notes);
      } catch (err) {
        console.error('[notes-store] listener error', err);
      }
    });
  }

  function setPending(id, entry) {
    pending.set(id, Object.assign({ until: Date.now() + LOCAL_OVERRIDE_MS }, entry));
  }

  function mergeWithPending(serverList) {
    const now = Date.now();
    pending.forEach((p, id) => {
      if (p.until < now) pending.delete(id);
    });

    const merged = serverList
      .filter((n) => {
        const p = pending.get(n.id);
        return !(p && p.op === 'delete');
      })
      .map((n) => {
        const p = pending.get(n.id);
        return p && p.op === 'update' ? p.note : n;
      });

    pending.forEach((p, id) => {
      if (p.op === 'create' && !merged.some((n) => n.id === id)) {
        merged.push(p.note);
      }
    });

    return merged;
  }

  async function fetchAll() {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('메모 목록을 불러오지 못했습니다.');
      const serverList = await res.json();
      notes = mergeWithPending(serverList);
      notify();
    } catch (err) {
      console.error('[notes-store]', err);
    }
  }

  async function createNote(data) {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('메모를 추가하지 못했습니다.');
    const note = await res.json();
    setPending(note.id, { op: 'create', note: note });
    notes = notes.concat(note);
    notify();
    return note;
  }

  async function updateNote(id, patch) {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('메모를 수정하지 못했습니다.');
    const note = await res.json();
    setPending(id, { op: 'update', note: note });
    notes = notes.map((n) => (n.id === id ? note : n));
    notify();
    return note;
  }

  async function removeNote(id) {
    setPending(id, { op: 'delete' });
    notes = notes.filter((n) => n.id !== id);
    notify();
    await fetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  function restoreNote(note) {
    pending.delete(note.id);
    return createNote(note);
  }

  function current() {
    return notes;
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn(notes);
    return function unsubscribe() {
      listeners.delete(fn);
    };
  }

  function startPolling() {
    fetchAll();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(fetchAll, POLL_INTERVAL);
  }

  window.NotesStore = {
    subscribe,
    current,
    createNote,
    updateNote,
    removeNote,
    restoreNote,
    startPolling,
    refresh: fetchAll,
  };
})();
