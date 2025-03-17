const { spawn } = require("child_process");

// Menjalankan Bot Discord
const discordBot = spawn("node", ["discordBot.js"], { stdio: "inherit" });

// Menjalankan Bot WhatsApp
const waBot = spawn("node", ["waBot.js"], { stdio: "inherit" });

// Menangani error atau proses keluar
discordBot.on("close", (code) => {
  console.log(`Bot Discord berhenti dengan kode: ${code}`);
});
waBot.on("close", (code) => {
  console.log(`Bot WhatsApp berhenti dengan kode: ${code}`);
});
