const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } = require("@whiskeysockets/baileys");
const multer = require('multer');

const app = express();
const port = 5000;

let sessions = {}; // Object to manage multiple sessions securely

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Function to initialize a new session for a user
const setupBaileysSession = async (sessionId) => {
  const sessionPath = path.join('./auth_info', sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const connectToWhatsApp = async () => {
    const MznKing = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
    });

    MznKing.ev.on('connection.update', async (s) => {
      const { connection, lastDisconnect } = s;
      if (connection === "open") {
        console.log(`WhatsApp connected successfully for session: ${sessionId}`);
        sessions[sessionId].connected = true;
      }
      if (connection === "close" && lastDisconnect?.error) {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.log(`Reconnecting for session: ${sessionId}`);
          await connectToWhatsApp();
        } else {
          console.log(`Session ${sessionId} closed. Restart the script.`);
          delete sessions[sessionId];
        }
      }
    });

    MznKing.ev.on('creds.update', saveCreds);
    sessions[sessionId].socket = MznKing;
  };

  sessions[sessionId] = { connected: false, socket: null };
  await connectToWhatsApp();
};

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generate pairing code
app.post('/generate-pairing-code', async (req, res) => {
  const phoneNumber = req.body.phoneNumber;
  const sessionId = phoneNumber; // Using phone number as session ID
  if (!sessions[sessionId]) {
    await setupBaileysSession(sessionId);
  }
  try {
    const pairCode = await sessions[sessionId].socket.requestPairingCode(phoneNumber);
    res.send({ status: 'success', pairCode });
  } catch (error) {
    res.send({ status: 'error', message: error.message });
  }
});

// Send messages
app.post('/send-messages', upload.single('messageFile'), async (req, res) => {
  const { phoneNumber, targetOption, numbers, groupUIDsInput, delayTime, haterNameInput } = req.body;
  const sessionId = phoneNumber;

  if (!sessions[sessionId] || !sessions[sessionId].connected) {
    return res.send({ status: 'error', message: 'WhatsApp not connected for this number.' });
  }

  try {
    const MznKing = sessions[sessionId].socket;
    const messages = req.file
      ? req.file.buffer.toString('utf-8').split('\n').filter(Boolean)
      : [];
    const targets = targetOption === '1' ? numbers.split(',') : groupUIDsInput.split(',');
    const intervalTime = parseInt(delayTime, 10);
    const haterName = haterNameInput;

    res.send({ status: 'success', message: 'Message sending initiated!' });

    for (const msg of messages) {
      const fullMessage = `${haterName} ${msg}`;
      for (const target of targets) {
        const jid = targetOption === '1' ? `${target}@c.us` : `${target}@g.us`;
        await MznKing.sendMessage(jid, { text: fullMessage });
        console.log(`Message sent to ${jid}`);
        await delay(intervalTime * 1000);
      }
    }
  } catch (error) {
    res.send({ status: 'error', message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
