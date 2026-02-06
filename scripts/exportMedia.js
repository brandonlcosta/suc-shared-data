'use strict';

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COMPILED_DIR = path.join(ROOT, 'compiled');
const EXPORTS_DIR = path.join(ROOT, 'exports');

const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
  'base64'
);

async function readJsonIfExists(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : null;
    if (code === 'ENOENT') return fallback;
    throw error;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeAssetSet(baseDir, caption) {
  await ensureDir(baseDir);
  await Promise.all([
    fs.writeFile(path.join(baseDir, 'cover.png'), PLACEHOLDER_PNG),
    fs.writeFile(path.join(baseDir, 'quote.png'), PLACEHOLDER_PNG),
    fs.writeFile(path.join(baseDir, 'caption.txt'), caption || '', 'utf8')
  ]);
}

async function exportRouteAssets(routesMap) {
  const routeCardsDir = path.join(EXPORTS_DIR, 'route-cards');
  const elevationDir = path.join(EXPORTS_DIR, 'elevation-profiles');
  await ensureDir(routeCardsDir);
  await ensureDir(elevationDir);

  for (const [routeId, data] of Object.entries(routesMap || {})) {
    const stats = data && data.stats ? data.stats : {};
    const caption = `${stats.name || routeId} | ${Math.round(stats.distanceMi || 0)} mi`;
    await writeAssetSet(path.join(routeCardsDir, routeId), caption);
    await writeAssetSet(path.join(elevationDir, routeId), caption);
  }
}

async function exportEventAssets(events) {
  const baseDir = path.join(EXPORTS_DIR, 'event-recaps');
  await ensureDir(baseDir);
  for (const event of events || []) {
    const id = event && (event.eventId || event.event_id || event.id);
    if (!id) continue;
    const caption = `${event.eventName || event.event_name || id} | ${event.eventDate || ''}`.trim();
    await writeAssetSet(path.join(baseDir, String(id)), caption);
  }
}

async function exportGearReviewAssets(reviews) {
  const baseDir = path.join(EXPORTS_DIR, 'gear-review-quotes');
  await ensureDir(baseDir);
  for (const review of reviews || []) {
    if (!review || !review.id) continue;
    const caption = `${review.id} | ${review.summary || ''}`.trim();
    await writeAssetSet(path.join(baseDir, String(review.id)), caption);
  }
}

async function exportCrewStoryAssets(stories) {
  const baseDir = path.join(EXPORTS_DIR, 'crew-story-quotes');
  await ensureDir(baseDir);
  for (const story of stories || []) {
    if (!story || !story.id) continue;
    const caption = `${story.person || story.id} | ${story.summary || ''}`.trim();
    await writeAssetSet(path.join(baseDir, String(story.id)), caption);
  }
}

async function main() {
  await ensureDir(EXPORTS_DIR);

  const routesPayload = await readJsonIfExists(path.join(COMPILED_DIR, 'routes.json'), {
    routes: {}
  });
  const eventsPayload = await readJsonIfExists(path.join(COMPILED_DIR, 'events.json'), []);
  const gearPayload = await readJsonIfExists(
    path.join(COMPILED_DIR, 'gear-reviews', 'index.json'),
    []
  );
  const crewPayload = await readJsonIfExists(
    path.join(COMPILED_DIR, 'crew-stories', 'index.json'),
    []
  );

  await exportRouteAssets(routesPayload.routes || {});
  await exportEventAssets(eventsPayload);
  await exportGearReviewAssets(gearPayload);
  await exportCrewStoryAssets(crewPayload);

  console.log('[SUC-SHARED-DATA] Media exports generated.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
