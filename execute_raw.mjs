import fs from 'fs';
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
    req.write(data);
    req.end();
  });
}

async function main() {
  const sql = fs.readFileSync('seed_raw.sql', 'utf8');
  console.log("Running Raw Seed...");
  const res = await runQuery(sql);
  console.log("SQL executed. Response:", res);

  console.log("Configuring Admin login bypassing email requirement...");
  const adminSql = `
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, app_metadata, user_metadata, is_super_admin, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('f9999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@clinic.com', crypt('MALAYALAM', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, now(), now(), '', '', '', '') 
    ON CONFLICT (email) DO NOTHING;
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES ('f9999999-9999-9999-9999-999999999999', 'f9999999-9999-9999-9999-999999999999', '{"sub":"f9999999-9999-9999-9999-999999999999","email":"admin@clinic.com"}', 'email', now(), now(), now())
    ON CONFLICT (provider, id) DO NOTHING;
  `;
  
  const adminRes = await runQuery(adminSql);
  console.log("Admin executed. Response:", adminRes);
}

main().catch(console.error);
