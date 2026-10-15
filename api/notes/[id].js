const { readNotes, writeNotes } = require('../../lib/notes-blob');

// Blob 저장소는 쓰기 직후 바로 읽으면 반영이 늦을 수 있어, 대상 메모가 보일 때까지 짧게 재시도합니다.
const RETRY_DELAYS_MS = [150, 300, 600, 1000];

async function findNote(id) {
  let notes = await readNotes();
  let idx = notes.findIndex((n) => n.id === id);

  for (let i = 0; idx === -1 && i < RETRY_DELAYS_MS.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[i]));
    notes = await readNotes();
    idx = notes.findIndex((n) => n.id === id);
  }

  return { notes, idx };
}

module.exports = async function handler(req, res) {
  const id = req.query.id;

  if (req.method === 'PATCH') {
    const body = req.body || {};
    const { notes, idx } = await findNote(id);
    if (idx === -1) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });

    const allowed = ['type', 'x', 'y', 'rotate', 'content'];
    allowed.forEach((key) => {
      if (key in body) notes[idx][key] = body[key];
    });

    await writeNotes(notes);
    return res.status(200).json(notes[idx]);
  }

  if (req.method === 'DELETE') {
    const { notes, idx } = await findNote(id);
    if (idx === -1) {
      // 대상이 끝까지 보이지 않아도, 삭제 요청의 목적(해당 id가 더 이상 존재하지 않음)은 이미 달성된 것으로 간주합니다.
      return res.status(200).json({ ok: true });
    }

    notes.splice(idx, 1);
    await writeNotes(notes);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
};
