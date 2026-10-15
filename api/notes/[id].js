const { mutateNotes } = require('../../lib/notes-blob');

// Blob 저장소는 쓰기 직후 바로 읽으면 반영이 늦을 수 있어, 대상 메모가 보일 때까지 짧게 재시도합니다.
// (쓰기 자체의 동시성 충돌 재시도는 mutateNotes 내부에서 처리합니다.)
const RETRY_DELAYS_MS = [150, 300, 600, 1000];

async function mutateExistingNote(id, apply) {
  for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
    let found = false;
    let value;
    await mutateNotes((notes) => {
      const idx = notes.findIndex((n) => n.id === id);
      if (idx === -1) return;
      found = true;
      value = apply(notes, idx);
    });
    if (found) return { found: true, value: value };
    if (i < RETRY_DELAYS_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[i]));
    }
  }
  return { found: false };
}

module.exports = async function handler(req, res) {
  const id = req.query.id;

  if (req.method === 'PATCH') {
    const body = req.body || {};
    const allowed = ['type', 'x', 'y', 'rotate', 'content'];

    const { found, value } = await mutateExistingNote(id, (notes, idx) => {
      allowed.forEach((key) => {
        if (key in body) notes[idx][key] = body[key];
      });
      return notes[idx];
    });

    if (!found) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
    return res.status(200).json(value);
  }

  if (req.method === 'DELETE') {
    await mutateExistingNote(id, (notes, idx) => {
      notes.splice(idx, 1);
      return true;
    });
    // 대상이 끝까지 보이지 않아도, 삭제 요청의 목적(해당 id가 더 이상 존재하지 않음)은 이미 달성된 것으로 간주합니다.
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
};
