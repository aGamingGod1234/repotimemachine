import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDocumentaryUserMessage, DOCUMENTARY_SYSTEM_PROMPT, type RepoDataForDocumentary } from "../lib/documentary-prompt";

function fixture(count: number): RepoDataForDocumentary {
  return {
    meta: { full_name:'org/repo', description:null, stars:1, forks:0, language:null, topics:[], default_branch:'trunk', created_at:'2020-01-01', updated_at:'2026-10-01', open_issues:0, homepage:null },
    commits:Array.from({ length:count }, (_, i) => ({ message:`commit-${i}-unique`, author:'author', date:'2026-01-01' })),
    contributors:[{ login:'author', contributions:0 }], releases:[], languages:{}, fileTree:[], readme:null, codeFrequency:null, topPullRequests:[{ title:'Proposal', number:1, user:'author', merged:false, state:'open', created_at:'2026-01-01' }], topIssues:[],
  };
}

test("small commit samples contain no repeated entries and remain honestly labeled", () => {
  for (let count = 0; count <= 8; count++) {
    const text = buildDocumentaryUserMessage(fixture(count));
    for (let index = 0; index < count; index++) assert.equal(text.split(`commit-${index}-unique`).length - 1, 1);
    assert.match(text, /not the full history/);
    assert.doesNotMatch(text, /NaN|Infinity|sampled across history/);
    assert.match(text, /\(open, /);
  }
  assert.match(DOCUMENTARY_SYSTEM_PROMPT, /never invent/);
});

test("larger samples include both ends of the recent window without duplicates", () => {
  const text = buildDocumentaryUserMessage(fixture(100));
  const sampled = text.match(/commit-\d+-unique/g) ?? [];
  assert.equal(sampled.length, 14);
  assert.equal(new Set(sampled).size, 14);
  assert.ok(sampled.includes('commit-0-unique'));
  assert.ok(sampled.includes('commit-99-unique'));
});
