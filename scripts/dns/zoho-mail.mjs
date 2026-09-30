// scripts/dns/zoho-mail.mjs — point lemyte.com mail at Zoho (India DC) via the Namecheap API.
//
//   node scripts/dns/zoho-mail.mjs                                   # show current records + planned change (dry run)
//   node scripts/dns/zoho-mail.mjs --verify "zoho-verification=zb…"  # add Zoho's domain-verification TXT
//   node scripts/dns/zoho-mail.mjs --dkim "zmail=v=DKIM1; k=rsa; p=…"   # add DKIM (selector=value)
//   … add --apply to write. Every run saves a backup of the current records to .dns-backups/.
//
// Needs NAMECHEAP_API_USER and NAMECHEAP_API_KEY in .env.local, and this machine's IP whitelisted
// in Namecheap (Profile → Tools → API Access). Namecheap's setHosts REPLACES all records, so this
// script always re-sends every existing record (website/Vercel records included) plus the changes.
import fs from "node:fs";

for (const line of fs.readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { NAMECHEAP_API_USER: user, NAMECHEAP_API_KEY: key } = process.env;
if (!user || !key) throw new Error("Add NAMECHEAP_API_USER and NAMECHEAP_API_KEY to .env.local");

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const APPLY = process.argv.includes("--apply");
const [SLD, TLD] = ["lemyte", "com"];
const ip = (await (await fetch("https://api.ipify.org")).text()).trim();

async function call(command, params = {}) {
  const q = new URLSearchParams({ ApiUser: user, ApiKey: key, UserName: user, ClientIp: ip, Command: command, SLD, TLD, ...params });
  const xml = await (await fetch(`https://api.namecheap.com/xml.response`, { method: "POST", body: q })).text();
  const err = xml.match(/<Error[^>]*>([^<]+)<\/Error>/);
  if (err) throw new Error(`Namecheap ${command}: ${err[1]} (client IP ${ip} must be whitelisted)`);
  return xml;
}

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const xml = await call("namecheap.domains.dns.getHosts");
const emailType = attrs(xml.match(/<DomainDNSGetHostsResult[^>]*>/)[0]).EmailType;
const current = [...xml.matchAll(/<host [^>]*\/>/g)].map((m) => {
  const a = attrs(m[0]);
  return { name: a.Name, type: a.Type, address: decode(a.Address), mxPref: a.MXPref, ttl: a.TTL };
});

fs.mkdirSync(".dns-backups", { recursive: true });
const backup = `.dns-backups/${SLD}.${TLD}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify({ emailType, hosts: current }, null, 2));
console.log(`Current (EmailType=${emailType}), backed up to ${backup}:`);
for (const h of current) console.log(`  ${h.type.padEnd(5)} ${h.name.padEnd(22)} ${h.address}${h.type === "MX" ? ` (${h.mxPref})` : ""}`);

// Planned records: keep everything except old MX and old SPF, then add Zoho's.
const isSpf = (h) => h.type === "TXT" && h.name === "@" && h.address.startsWith("v=spf1");
const next = current.filter((h) => h.type !== "MX" && !isSpf(h));
const add = (h) => {
  if (!next.some((x) => x.type === h.type && x.name === h.name && x.address === h.address)) next.push({ ttl: "1800", ...h });
};
add({ name: "@", type: "MX", address: "mx.zoho.in.", mxPref: "10" });
add({ name: "@", type: "MX", address: "mx2.zoho.in.", mxPref: "20" });
add({ name: "@", type: "MX", address: "mx3.zoho.in.", mxPref: "50" });
add({ name: "@", type: "TXT", address: arg("--spf") ?? "v=spf1 include:zoho.in ~all" });
const verify = arg("--verify");
if (verify) add({ name: "@", type: "TXT", address: verify });
const dkim = arg("--dkim"); // "selector=value", e.g. zmail=v=DKIM1; k=rsa; p=MIGf…
if (dkim) {
  const i = dkim.indexOf("=");
  add({ name: `${dkim.slice(0, i)}._domainkey`, type: "TXT", address: dkim.slice(i + 1) });
}

console.log("\nPlanned (EmailType=MX):");
for (const h of next) console.log(`  ${h.type.padEnd(5)} ${h.name.padEnd(22)} ${h.address}${h.type === "MX" ? ` (${h.mxPref})` : ""}`);
if (!next.some((h) => h.name === "@" && (h.type === "A" || h.type === "ALIAS" || h.type === "CNAME")))
  console.warn("\n  WARNING: no website record at @ in the plan — check before applying.");

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to write these records.");
} else {
  const params = { EmailType: "MX" };
  next.forEach((h, i) => {
    const n = i + 1;
    Object.assign(params, { [`HostName${n}`]: h.name, [`RecordType${n}`]: h.type, [`Address${n}`]: h.address, [`TTL${n}`]: h.ttl || "1800" });
    if (h.type === "MX") params[`MXPref${n}`] = h.mxPref || "10";
  });
  const res = await call("namecheap.domains.dns.setHosts", params);
  console.log(/IsSuccess="true"/.test(res) ? "\nApplied. DNS can take up to 30 minutes to show everywhere." : `\nUnexpected response:\n${res}`);
}
