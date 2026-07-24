const https = require('https');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function countProducts() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/products?select=count',
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'count=exact'
      }
    };
    const req = https.request(options, (res) => {
      let respData = '';
      res.on('data', c => respData += c);
      res.on('end', () => {
        console.log('Status code:', res.statusCode);
        console.log('Headers:', res.headers);
        console.log('Response body:', respData);
        resolve(res.headers['content-range']);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

countProducts().then(r => console.log('Content Range:', r)).catch(err => console.error(err));
