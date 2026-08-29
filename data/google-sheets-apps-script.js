const SHEET_NAME = "UofR Bangla Experiences";

function doPost(event) {
  const sheet = getSheet();
  const data = JSON.parse(event.postData.contents);

  sheet.appendRow([
    new Date(),
    data.section || "",
    data.sectionTitle || "",
    data.visibility || "",
    data.name || "",
    data.date || "",
    data.experience || "",
    data.submittedAt || "",
  ]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Saved At",
      "Section ID",
      "Section Title",
      "Visibility",
      "Name",
      "Date",
      "Experience",
      "Submitted At",
    ]);
  }

  return sheet;
}
