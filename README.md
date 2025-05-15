TO RUN :- node index.js

⚠️ Error Code 515 in Baileys
Meaning:
This usually happens when WhatsApp blocks the connection after a successful pairing. It's a security mechanism triggered when something about the connection is suspicious (like headless or unofficial clients).

✅ Here's how to fix or mitigate it:
Clear previous auth and retry pairing:
Delete the auth/ folder:

bash
Copy
Edit
rm -rf auth/
Then re-run your bot to re-scan the QR code and re-establish a new session
