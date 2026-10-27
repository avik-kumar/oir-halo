/**
 * Google Apps Script for Halo sim leaderboards.
 *
 * Setup:
 * 1. Create a Google Sheet with header row:
 *    ts,name,trackId,timeSec,whUsed,valid,effEligible,simVersion,packId
 * 2. Extensions → Apps Script → paste this file.
 * 3. Set SHEET_NAME if needed. Optionally set TOKEN to match leaderboard-config.js.
 * 4. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone
 * 5. Put the web app URL in js/leaderboard-config.js (tracked for GitHub Pages).
 * Browser clients POST text/plain JSON (avoids CORS preflight). TOKEN optional.
 */

const SHEET_NAME = 'Sheet1';
const TOKEN = ''; // optional; must match LEADERBOARD_TOKEN in the sim config

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function checkToken_(e) {
  if (!TOKEN) return true;
  const t = (e.parameter && e.parameter.token) || '';
  return t === TOKEN;
}

function doGet(e) {
  if (!checkToken_(e)) return json_({ error: 'unauthorized' });
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return json_([]);
  const headers = values[0].map(String);
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    headers.forEach((h, j) => { row[h] = values[i][j]; });
    row.valid = row.valid === true || row.valid === 'true' || row.valid === 1;
    row.effEligible = row.effEligible === true || row.effEligible === 'true' || row.effEligible === 1;
    row.timeSec = Number(row.timeSec);
    row.whUsed = Number(row.whUsed);
    rows.push(row);
  }
  const trackId = e.parameter && e.parameter.trackId;
  return json_(trackId ? rows.filter((r) => r.trackId === trackId) : rows);
}

function doPost(e) {
  if (!checkToken_(e)) return json_({ error: 'unauthorized' });
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: 'bad json' });
  }
  if (!body.name || !body.trackId || body.timeSec == null) {
    return json_({ error: 'missing fields' });
  }
  const sh = sheet_();
  sh.appendRow([
    body.ts || new Date().toISOString(),
    String(body.name).slice(0, 64),
    body.trackId,
    Number(body.timeSec),
    Number(body.whUsed || 0),
    !!body.valid,
    !!body.effEligible,
    body.simVersion || '',
    body.packId || '',
  ]);
  return json_({ ok: true });
}
