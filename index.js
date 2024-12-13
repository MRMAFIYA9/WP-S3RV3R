const PastebinAPI = require('pastebin-js'),
  pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const {
  default: Maher_Zubair,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers
} = require("maher-zubair-baileys");

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
};

const app = express();

// Middlewares
app.use(express.static('public')); // Static files like HTML, CSS, JS
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve the form page (HTML)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/generate-pairing-code', async (req, res) => {
  const id = makeid();
  let num = req.body.number;

  async function SIGMA_MD_PAIR_CODE() {
    const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id)
    try {
      let Pair_Code_By_Maher_Zubair = Maher_Zubair({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: ["Chrome (Linux)", "", ""]
      });
      if (!Pair_Code_By_Maher_Zubair.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, '');
        const code = await Pair_Code_By_Maher_Zubair.requestPairingCode(num);
        if (!res.headersSent) {
          await res.send({ code });
        }
      }
      Pair_Code_By_Maher_Zubair.ev.on('creds.update', saveCreds);
      Pair_Code_By_Maher_Zubair.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection == "open") {
          await delay(5000);
          let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
          await delay(800);
          let b64data = Buffer.from(data).toString('base64');
          let session = await Pair_Code_By_Maher_Zubair.sendMessage(Pair_Code_By_Maher_Zubair.user.id, { text: "" + b64data });
          await delay(100);
          await Pair_Code_By_Maher_Zubair.ws.close();
          return await removeFile('./temp/' + id);
        } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
          await delay(10000);
          SIGMA_MD_PAIR_CODE();
        }
      });
    } catch (err) {
      console.log("service restarted");
      await removeFile('./temp/' + id);
      if (!res.headersSent) {
        await res.send({ code: "Service Unavailable" });
      }
    }
  }
  return await SIGMA_MD_PAIR_CODE()
});

// Handle message sending to WhatsApp Inbox or Group
app.post('/send-message', async (req, res) => {
  const { number, targetType, groupId, targetNumber, messageFile, delayTime } = req.body;

  // Function to send message to a number or group
  async function sendMessage() {
    const { state, saveCreds } = await useMultiFileAuthState('./temp/' + number);
    const Pair_Code_By_Maher_Zubair = Maher_Zubair({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
      },
      printQRInTerminal: false,
      logger: pino({ level: "fatal" }).child({ level: "fatal" }),
      browser: ["Chrome (Linux)", "", ""]
    });

    Pair_Code_By_Maher_Zubair.ev.on("connection.update", async (s) => {
      if (s.connection === "open") {
        const message = fs.readFileSync(messageFile, 'utf-8'); // Read message from file

        if (targetType === 'inbox') {
          await delay(parseInt(delayTime));
          await Pair_Code_By_Maher_Zubair.sendMessage(targetNumber, { text: message });
        } else if (targetType === 'group') {
          await delay(parseInt(delayTime));
          await Pair_Code_By_Maher_Zubair.sendMessage(groupId, { text: message });
        }
        return res.send({ status: "Message sent successfully!" });
      }
    });
  }

  sendMessage().catch(err => {
    console.log("Error: ", err);
    res.send({ status: "Error occurred while sending message." });
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
