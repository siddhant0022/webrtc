const twilio = require('twilio');

// Replace with your actual credentials from Twilio Console
const accountSid = 'AC9ab131cef39135bc4be8432f7bd46b4f';
const authToken = 'f59595621008c9cfd0e977159e359ee0';
const client = twilio(accountSid, authToken);

// Generate TURN credentials
async function getTurnCredentials() {
  try {
    const token = await client.tokens.create({
      ttl: 3600 // 1 hour expiry
    });
    
    // console.log('TURN Server Configuration:');
    // console.log(JSON.stringify(token.iceServers, null, 2));
    
    console.log(token.iceServers);
    return token.iceServers;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getTurnCredentials();