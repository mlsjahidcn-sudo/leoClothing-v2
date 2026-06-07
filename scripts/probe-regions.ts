import { Client } from "pg";

async function main() {
  // Try the IPv6 address directly with a long timeout
  const cs = "postgresql://postgres:BigBoss007GG@[2406:da1a:b00:1301:3672:6056:c294:af79]:5432/postgres";
  const c = new Client({ connectionString: cs, connectionTimeoutMillis: 30000 });
  try {
    await c.connect();
    const v = await c.query("select current_database() as db, inet_server_addr() as addr");
    console.log("OK  direct-ipv6 -> " + JSON.stringify(v.rows[0]));
    await c.end();
  } catch (e: any) {
    console.log("NO  " + e.code + ": " + (e.message as string).split("\n")[0]);
  }
}
main();