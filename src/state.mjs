import { readFile } from 'node:fs/promises';

const organismUrl = new URL('../.emergence/organism.json', import.meta.url);
const candidateUrl = new URL('../.emergence/candidate.json', import.meta.url);

export async function getState() {
  const [organism, candidate] = await Promise.all([
    readJson(organismUrl),
    readJson(candidateUrl)
  ]);

  return {
    name: 'EMERGENCE',
    identity: organism.identity,
    generation: Number(process.env.EMERGENCE_GENERATION ?? 0),
    commit: process.env.GITHUB_SHA ?? process.env.EMERGENCE_COMMIT ?? 'working-tree',
    born: '2026-07-18',
    axiom: 'No roadmap. Survive contact with the next agent.',
    seedIntent: candidate.intent,
    mutable: true
  };
}

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}
