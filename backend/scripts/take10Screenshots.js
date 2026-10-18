const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.join(__dirname, '..', '..', 'postman_view.html');
const outDir = path.join(__dirname, '..', '..', 'screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const tests = [
  { key: 'TC-04', filename: 'TC-04_Invalid_User_Login.png' },
  { key: 'TC-07', filename: 'TC-07_Search_Parking.png' },
  { key: 'TC-13', filename: 'TC-13_Prevent_Double_Booking.png' },
  { key: 'TC-15', filename: 'TC-15_Cancel_Reservation.png' },
  { key: 'TC-17', filename: 'TC-17_Payment_Processing.png' },
  { key: 'TC-24', filename: 'TC-24_Parking_Space_Validation.png' },
  { key: 'TC-29', filename: 'TC-29_Search_Filter_Reservations.png' },
  { key: 'TC-34', filename: 'TC-34_QR_Code_Scanning.png' },
  { key: 'TC-35', filename: 'TC-35_Staff_Access_Control.png' },
  { key: 'TC-39', filename: 'TC-39_Error_Handling.png' },
];

for (const t of tests) {
  const outFile = path.join(outDir, t.filename);
  const targetUrl = `file:///${htmlPath.replace(/\\/g, '/')}?test=${t.key}`;
  const cmd = `"${chromePath}" --headless=new --disable-gpu --window-size=1400,850 --screenshot="${outFile}" "${targetUrl}"`;
  console.log(`Capturing ${t.key} -> ${t.filename}...`);
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`Saved: ${t.filename}`);
  } catch (err) {
    console.error(`Failed ${t.key}:`, err.message);
  }
}
console.log('Finished capturing all 10 unhighlighted Postman screenshots!');
