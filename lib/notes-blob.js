const { get, put } = require('@vercel/blob');

const NOTES_PATHNAME = 'notes.json';

const SEED_NOTES = [
  {
    id: 'seed-p01-1',
    screen: 'p-01',
    type: 'dev',
    x: 62,
    y: 30,
    rotate: -2.4,
    content: '재고 0 도달 시 자동 품절 처리 시점 개발 협의 필요',
    date: '10/10',
    createdAt: '2026-10-10T02:10:00.000Z',
  },
  {
    id: 'seed-p01-2',
    screen: 'p-01',
    type: 'policy',
    x: 60,
    y: 58,
    rotate: 3.1,
    content: '도서산간 추가 배송비 기준 정책 확인 필요',
    date: '10/11',
    createdAt: '2026-10-11T05:40:00.000Z',
  },
  {
    id: 'seed-p02-1',
    screen: 'p-02',
    type: 'design',
    x: 64,
    y: 46,
    rotate: -1.6,
    content: '주문 상태 배지 색상 디자인 확인 필요',
    date: '10/12',
    createdAt: '2026-10-12T01:20:00.000Z',
  },
  {
    id: 'seed-p02-2',
    screen: 'p-02',
    type: 'policy',
    x: 10,
    y: 20,
    rotate: 2.0,
    content: '부분 취소 주문의 조회 조건 포함 여부 정책 확인 필요',
    date: '10/13',
    createdAt: '2026-10-13T06:05:00.000Z',
  },
  {
    id: 'seed-sa01-1',
    screen: 'sa-01',
    type: 'dev',
    x: 58,
    y: 34,
    rotate: -3.0,
    content: '정책 변경 시 기존 접수 주문에도 적용할지 개발 협의 필요',
    date: '10/14',
    createdAt: '2026-10-14T08:00:00.000Z',
  },
];

function formatDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}`;
}

function randomRotate() {
  return Math.round((Math.random() * 8 - 4) * 10) / 10;
}

async function readNotes() {
  const result = await get(NOTES_PATHNAME, { access: 'public', useCache: false });
  if (!result) {
    await writeNotes(SEED_NOTES);
    return SEED_NOTES;
  }
  const text = await new Response(result.stream).text();
  try {
    return JSON.parse(text);
  } catch (err) {
    return [];
  }
}

async function writeNotes(notes) {
  await put(NOTES_PATHNAME, JSON.stringify(notes), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

module.exports = { readNotes, writeNotes, formatDate, randomRotate };
