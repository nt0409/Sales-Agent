const qrcode = require('qrcode-terminal');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys');
const axios = require('axios');
const { sleep } = require('./utils');

async function startWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');

  const sock = makeWASocket({
    auth: state,
    browser: ['WhatsApp', 'Mac OS', '10.15.7'],
    printQRInTerminal: true,
  });

  // In-memory conversation store (phoneNumber -> conversation array)
  const conversations = {};

  // Function to send initial outreach message to a specific number
  async function sendInitialMessage(to) {
    const message = "Hi! Are you interested in our online courses? Reply here to know more.";
    await sock.sendMessage(to, { text: message });
    conversations[to] = [{ role: 'agent', content: message }];
    console.log(`📤 Initial message sent to ${to}`);
  }

  // Replace with the WhatsApp ID (phone number with country code + '@s.whatsapp.net')
  const outreachNumber = '91@s.whatsapp.net';

  // Connection update handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('✅ Connected to WhatsApp.');
      if (!conversations[outreachNumber]) {
        await sendInitialMessage(outreachNumber);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        startWhatsAppBot(); // Auto reconnect except if logged out
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Incoming message handler
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (!messages || type !== 'notify') return;

    const msg = messages[0];
    const sender = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

    if (!text || msg.key.fromMe) return;
    if (sender !== outreachNumber) return; // optional: only respond to outreachNumber

    console.log(`📩 Message from ${sender}: ${text}`);

    if (!conversations[sender]) conversations[sender] = [];
    conversations[sender].push({ role: 'user', content: text });

    try {
      const conversationContext = conversations[sender].slice(-10).filter(m => m.content && m.role);
      console.log('Sending to backend:', { thread_id: sender, conversation: conversationContext, message: text });

      const res = await axios.post('http://localhost:8000/reply', {
        thread_id: sender,
        conversation: conversationContext,
        message: text  // <-- Added this field as required by backend
      });

      const reply = res.data.reply || "Sorry, I didn't understand that.";
      conversations[sender].push({ role: 'agent', content: reply });

      await sock.sendMessage(sender, { text: reply });
      console.log(`📤 Replied to ${sender}: ${reply}`);
    } catch (err) {
      console.error('❌ Error from backend LLM:', err.message);
      await sock.sendMessage(sender, { text: "Sorry, there was an error processing your message." });
    }
  });

  // Graceful shutdown on Ctrl+C
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await sock.logout();
    process.exit(0);
  });
}

module.exports = { startWhatsAppBot };
