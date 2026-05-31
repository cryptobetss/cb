#!/usr/bin/env node
/**
 * Generate a bcrypt hash for your admin password.
 * Usage: npm run gen-hash
 * Then copy the output into your Render environment variable ADMIN_PASSWORD_HASH.
 */
const bcrypt   = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Hide input while typing
function question(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    process.stdin.setRawMode?.(true);
    let input = '';
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function handler(ch) {
      ch = ch.toString();
      if (ch === '\n' || ch === '\r' || ch === '\u0004') {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener('data', handler);
        process.stdout.write('\n');
        resolve(input);
      } else if (ch === '\u0003') {
        process.exit();
      } else if (ch === '\u007f') {
        input = input.slice(0, -1);
      } else {
        input += ch;
        process.stdout.write('*');
      }
    });
  });
}

(async () => {
  console.log('\n🔐 CryptoBet — Admin Password Hash Generator\n');
  const pwd  = await question('Enter your admin password: ');
  const pwd2 = await question('Confirm password:          ');

  if (pwd !== pwd2) {
    console.error('\n❌ Passwords do not match. Try again.\n');
    process.exit(1);
  }
  if (pwd.length < 8) {
    console.error('\n❌ Password must be at least 8 characters.\n');
    process.exit(1);
  }

  console.log('\n⏳ Generating hash (this takes a moment)…');
  const hash = await bcrypt.hash(pwd, 12);

  console.log('\n✅ Done! Copy this value into Render > Environment > ADMIN_PASSWORD_HASH:\n');
  console.log(hash);
  console.log('\n⚠  Never commit this hash to Git if your repo is public.\n');
  rl.close();
})();
