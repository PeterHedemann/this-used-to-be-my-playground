import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { readLimitedBody, safeFilename, validateImage } from '../lib/image-processing.ts';

test('body limit stops oversized chunked responses and cancels the reader', async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(5)); controller.enqueue(new Uint8Array(6)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(readLimitedBody(body, 10), { status: 413 });
  assert.equal(cancelled, true);
});

test('body reader preserves exact bytes at the limit', async () => {
  const body = new Response(new Uint8Array([1, 2, 3])).body;
  assert.deepEqual(await readLimitedBody(body, 3), new Uint8Array([1, 2, 3]));
});

test('filename is safe for headers and retains PNG extension', () => {
  assert.equal(safeFilename('../../photo.png'), 'photo.png');
  assert.equal(safeFilename('x\r\n".png'), 'x___.png');
  assert.equal(safeFilename(null), 'result.png');
});

test('validates PNG content and reads actual output dimensions', async () => {
  const png = await sharp({ create: { width: 1072, height: 1456, channels: 3, background: 'white' } }).png().toBuffer();
  const metadata = await validateImage(png, true);
  assert.equal(metadata.width, 1072);
  assert.equal(metadata.height, 1456);
  await assert.rejects(validateImage(png.subarray(0, 50), true), { status: 502 });
  const small = await sharp(png).resize(10, 10).png().toBuffer();
  assert.equal((await validateImage(small, true)).width, 10);
  const jpeg = await sharp(png).jpeg().toBuffer();
  await assert.rejects(validateImage(jpeg, true), { status: 502 });
  await validateImage(small);
  await assert.rejects(validateImage(new TextEncoder().encode('<svg></svg>')), { status: 400 });
});
