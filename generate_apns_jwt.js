const jwt = require('jsonwebtoken');
const fs = require('fs');

// --- Configuration ---
const KEY_ID = 'F5M2DGDMC4'; // Replace with your 10-char Key ID
const TEAM_ID = 'JM6RWFSRJ9'; // Replace with your 10-char Team ID
const P8_KEY_PATH = '/Users/kieran/Downloads/AuthKey_T95LG8A659.p8'; // Replace with the ACTUAL path to your .p8 file
// ---------------------

const privateKey = fs.readFileSync(P8_KEY_PATH);

const now = Math.floor(Date.now() / 1000);
// Token is valid for 1 hour (3600 seconds)
const expiration = now + 3600;

const payload = {
  iss: TEAM_ID,
  iat: now,
  // exp: expiration // Optional: uncomment if you want expiration
};

const header = {
  alg: 'ES256',
  kid: KEY_ID,
};

try {
  const token = jwt.sign(payload, privateKey, { header: header });
  console.log('Generated APNs JWT Token:');
  console.log(token);
} catch (error) {
  console.error('Error generating JWT:', error);
}
