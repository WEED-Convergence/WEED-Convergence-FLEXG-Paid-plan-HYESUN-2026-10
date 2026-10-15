/* 메모 데이터를 서버와 주고받고, 10초마다 폴링하여 구독자에게 전달합니다. */
(function () {
  const API_BASE = '/api/notes';
  const POLL_INTERVAL = 10000;

  let notes = [];
  let pollTimer = null;
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => {
      try {
        fn(notes);
      } catch (err) {
        console.error('[notes-store] listener error', err);
      }
    });
  }

  async function fetchAll() {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('메모 목록을 불러오지 못했습니다.');
      notes = await res.json();
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
    notes = notes.map((n) => (n.id === id ? note : n));
    notify();
    return note;
  }

  async function removeNote(id) {
    await fetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    notes = notes.filter((n) => n.id !== id);
    notify();
  }

  function restoreNote(note) {
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
