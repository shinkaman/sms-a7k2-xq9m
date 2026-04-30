const GAS_SECRET_TOKEN = "sms-builder-2026";
const GAS_SPREADSHEET_ID = "1KZGux15EF484XfMJB4MR_aQDThaOUo66xcEeuaaft68"; // ここを実際のスプレッドシートIDに置き換えてください
const GAS_SHEET_NAME = "templates"; // シート名を必要に応じて修正してください

function doOptions(e) {
  return createCorsResponse({ status: "ok" });
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return createCorsResponse({ error: "POST not supported. Use GET with query params." }, 405);
}

function handleRequest(e) {
  const params = e.parameter || {};

  if (!isValidToken(params.token)) {
    return createCorsResponse({ error: "Invalid token." }, 401);
  }

  try {
    if (params.action === "add") {
      return handleAdd(params);
    }
    if (params.action === "delete") {
      return handleDelete(params);
    }
    return handleList();
  } catch (error) {
    return createCorsResponse({ error: error.message || "Unknown error." }, 500);
  }
}

function isValidToken(token) {
  return token === GAS_SECRET_TOKEN;
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(GAS_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(GAS_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet not found: ${GAS_SHEET_NAME}`);
  }
  return sheet;
}

function handleList() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const rows = values.slice(1).filter((row) => row.some((cell) => cell !== ""));

  const data = rows.map((row) => ({
    id: row[0],
    title: row[1],
    body: row[2],
    created_at: row[3]
  }));

  return createCorsResponse({ data });
}

function handleAdd(params) {
  const title = (params.title || "").toString().trim();
  const body = (params.body || "").toString().trim();
  if (!title || !body) {
    throw new Error("Title and body are required.");
  }

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);
  const ids = rows.map((row) => Number(row[0]) || 0);
  const nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  const createdAt = new Date();

  sheet.appendRow([nextId, title, body, createdAt]);

  return createCorsResponse({ data: { id: nextId, title, body, created_at: createdAt } });
}

function handleDelete(params) {
  const id = Number(params.id);
  if (!id) {
    throw new Error("Invalid id.");
  }

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const rows = values.slice(1);
  const rowIndex = rows.findIndex((row) => Number(row[0]) === id);

  if (rowIndex === -1) {
    throw new Error("Template not found.");
  }

  sheet.deleteRow(rowIndex + 2);
  return createCorsResponse({ data: { deleted: true } });
}

function createCorsResponse(payload, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader("Access-Control-Allow-Origin", "*");
  output.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  output.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (statusCode) {
    output.setHeader("X-App-Status", statusCode.toString());
  }
  return output;
}
