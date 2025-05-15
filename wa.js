const qrcode = require('qrcode-terminal');
const { default: makeWASocket, useMultiFileAuthState } = require('baileys');
const { Boom } = require('@hapi/boom');
const getAgentReply = require('./agent');
const { sleep } = require('./utils'); // Ensure this import is correct

async function startWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: state,
    browser: ['WhatsApp', 'Mac OS', '10.15.7'],  // spoofed browser
    printQRInTerminal: false,  // we'll use our custom QR printer
  });

  // 📌 Print QR in terminal
  sock.ev.on('connection.update', async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });  // Show QR code for scanning
    }

    if (connection === 'open') {
      console.log('✅ Connected to WhatsApp.');
      await sleep(3000);  // Optional: Let it settle before interacting further

      // Send a test message
      console.log("✅ Sending message to '919123456789@s.whatsapp.net'...");
      await sock.sendMessage(
        '919967425350@s.whatsapp.net', // replace with your target number
        { text: 'Hello! I’m your AI assistant.' }
      );
      console.log("✅ Message sent!");
    }

    if (lastDisconnect?.error) {
      console.log('Connection closed due to an error', lastDisconnect.error);

      if (lastDisconnect.error?.output?.statusCode === 515) {
        console.log('Stream error: Retrying connection...');
        await sleep(5000);  // Add delay before retrying
        startWhatsAppBot();  // Restart the bot
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (!messages || type !== 'notify') return;

    const msg = messages[0];
    const sender = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

    if (!text || msg.key.fromMe) return;

    // ⏱️ Introduce a delay before replying (e.g., 2 seconds)
    await sleep(2000);

    const reply = await getAgentReply(text);
    await sock.sendMessage(sender, { text: reply });
  });
}

module.exports = { startWhatsAppBot };
