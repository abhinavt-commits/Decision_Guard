// Makes a QR code for the judges: npm run qr -- https://your-app.vercel.app
import QRCode from "qrcode";
const url = process.argv[2];
if (!url) { console.error("Usage: npm run qr -- https://your-app.vercel.app/login"); process.exit(1); }
await QRCode.toFile("qr-code.png", url, { width: 900, margin: 2, color: { dark: "#0f1b2d", light: "#ffffff" } });
console.log("Saved qr-code.png for", url);
