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
      res.on('end', () => resolve(body));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const sql = `
    TRUNCATE TABLE public.patient_treatments CASCADE;
    TRUNCATE TABLE public.payments CASCADE;
    TRUNCATE TABLE public.billing CASCADE;
    TRUNCATE TABLE public.patients CASCADE;
    TRUNCATE TABLE public.bookings CASCADE;
    TRUNCATE TABLE public.leads CASCADE;
    
    UPDATE public.rooms SET status = 'Available';
  `;
  
  console.log("Cleaning database...");
  const res = await runQuery(sql);
  console.log("Response:", res);
}

main().catch(console.error);
