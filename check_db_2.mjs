import https from 'https';

const url = 'https://api.supabase.com/v1/projects/tlkejvmwmxsygwojfltu/database/query';
const token = 'sbp_15db40721c4d71ea8dc3d31dbe2303f66407e9f7';

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch(e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const res = await runQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  console.log(res);
}

main().catch(console.error);
