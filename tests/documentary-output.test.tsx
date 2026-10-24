import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import DocumentaryOutput from "../app/components/documentary-output";

test("renders the prompt format without losing body text that mentions section names", () => {
  const html = renderToStaticMarkup(<DocumentaryOutput loading={false} raw={`# The Story
A small project enters a new Era.

## ⏳ The Genesis
- **The Spark:** Genesis began as a weekend project.

## 📈 Scale Today
- **Stars:** 100 | **Forks:** 20
- **Impact:** Today it helps developers.

## 🔄 Turning Points
- **May 2020** — Era begins: Contributors ship the first release.

## 👥 Characters
- **@dev** — Created the Genesis library.

## 🗺️ Eras
**First Era** — 2020–2021
The first Era brought new contributors.

## 🦋 Butterfly Effect
The Butterfly release changed the direction.

## Additional context
Unrecognized sections remain visible.`} />);
  for (const text of ['The Story', 'A small project enters a new Era.', 'Genesis began as a weekend project.', 'Stars: 100', 'Today it helps developers.', 'Era begins', 'Created the Genesis library.', 'The first Era brought new contributors.', 'The Butterfly release changed the direction.', 'Unrecognized sections remain visible.']) {
    assert.ok(html.includes(text), text);
  }
  assert.equal(html.split('A small project enters a new Era.').length - 1, 1);
  assert.ok(!html.includes('**Stars:**'));
});

test("plain text remains visible and generated HTML is escaped", () => {
  const html = renderToStaticMarkup(<DocumentaryOutput loading={false} raw={'Unstructured documentary.\n\n<script>alert("bad")</script>'} />);
  assert.ok(html.includes('Unstructured documentary.'));
  assert.ok(!html.includes('<script>'));
});
