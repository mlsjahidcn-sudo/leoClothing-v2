import { readFileSync } from "node:fs";
import dns from "node:dns/promises";
import { Client } from "pg";

// Force IPv4 to avoid IPv6 timeouts on networks that route IPv6 poorly.
async function ipv4Lookup(host: string): Promise<{ address: string; family: 4 }> {
  const { address } = await dns.lookup(host, { family: 4 });
  return { address, family: 4 };
}

async function main() {
  const [, , conn, ...files] = process.argv;
  if (!conn || files.length === 0) {
    console.error("Usage: tsx scripts/run-sql.ts <conn-string> <file1.sql> [file2.sql ...]");
    process.exit(2);
  }
  const client = new Client({ connectionString: conn, lookup: ipv4Lookup });
  await client.connect();
  console.log("Connected.");
  try {
    for (const file of files) {
      const sql = readFileSync(file, "utf8");
      const label = file.split(/[\\/]/).pop();
      process.stdout.write(`> ${label} ... `);
      const t0 = Date.now();
      await client.query(sql);
      console.log(`done in ${Date.now() - t0}ms`);
    }
  } catch (err) {
    console.error(`\nFailed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main().catch((err) => { console.error(err); process.exit(1); });