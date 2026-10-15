const { readNotes, writeNotes } = require('../../lib/notes-blob');

module.exports = async function handler(req, res) {
  const id = req.query.id;

  if (req.method === 'PATCH') {
    const body = req.body || {};
    const notes = await readNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });

    const allowed = ['type', 'x', 'y', 'rotate', 'content'];
    allowed.forEach((key) => {
      if (key in body) notes[idx][key] = body[key];
    });

    await writeNotes(notes);
    return res.status(200).json(notes[idx]);
  }

  if (req.method === 'DELETE') {
    const notes = await readNotes();
    const next = notes.filter((n) => n.id !== id);
    await writeNotes(next);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
};
