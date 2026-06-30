const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..", "..");
const builderPath = path.join(
  repoRoot,
  "tools",
  "ClientSETUP",
  "scripts",
  "build-gateway-cert.js",
);

function readFirstCertificate(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const match = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/.exec(raw);
  return match ? match[0] : raw;
}

function certificateHasAltNames(certPath, dnsNames, ipNames) {
  const x509 = new crypto.X509Certificate(readFirstCertificate(certPath));
  const actualDnsNames = new Set();
  const actualIpNames = new Set();
  for (const entry of String(x509.subjectAltName || "").split(",")) {
    const normalized = entry.trim();
    if (normalized.startsWith("DNS:")) {
      actualDnsNames.add(normalized.slice(4).trim().toLowerCase());
    } else if (normalized.startsWith("IP Address:")) {
      actualIpNames.add(normalized.slice("IP Address:".length).trim());
    }
  }
  return (
    dnsNames.every((name) => actualDnsNames.has(String(name).toLowerCase())) &&
    ipNames.every((ip) => actualIpNames.has(String(ip)))
  );
}

function certificateIsSignedByCa(certPath, caCertPath) {
  const leaf = new crypto.X509Certificate(readFirstCertificate(certPath));
  const ca = new crypto.X509Certificate(readFirstCertificate(caCertPath));
  return leaf.issuer === ca.subject && leaf.verify(ca.publicKey);
}

function runBuilder(args) {
  const result = childProcess.spawnSync(process.execPath, [builderPath, ...args], {
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `builder failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
}

test("ClientSETUP certificate builder creates CA, XMPP, and gateway certs", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "evejs-clientsetup-certs-"));
  const caCertPath = path.join(tempRoot, "server", "certs", "xmpp-ca-cert.pem");
  const caKeyPath = path.join(tempRoot, "server", "certs", "xmpp-ca-key.pem");
  const xmppCertPath = path.join(tempRoot, "server", "certs", "xmpp-dev-cert.pem");
  const xmppKeyPath = path.join(tempRoot, "server", "certs", "xmpp-dev-key.pem");
  const gatewayCertPath = path.join(
    tempRoot,
    "server",
    "src",
    "_secondary",
    "express",
    "certs",
    "gateway-dev-cert.pem",
  );
  const gatewayKeyPath = path.join(
    tempRoot,
    "server",
    "src",
    "_secondary",
    "express",
    "certs",
    "gateway-dev-key.pem",
  );

  runBuilder([
    "--ensure-ca",
    "--ca-cert",
    caCertPath,
    "--ca-key",
    caKeyPath,
    "--common-name",
    "localhost",
    "--dns",
    "localhost",
    "--ip",
    "127.0.0.1",
    "--out-cert",
    xmppCertPath,
    "--out-key",
    xmppKeyPath,
  ]);
  runBuilder([
    "--ca-cert",
    caCertPath,
    "--ca-key",
    caKeyPath,
    "--out-cert",
    gatewayCertPath,
    "--out-key",
    gatewayKeyPath,
  ]);

  for (const filePath of [
    caCertPath,
    caKeyPath,
    xmppCertPath,
    xmppKeyPath,
    gatewayCertPath,
    gatewayKeyPath,
  ]) {
    assert.equal(fs.existsSync(filePath), true, filePath);
  }

  const ca = new crypto.X509Certificate(readFirstCertificate(caCertPath));
  assert.match(ca.subject, /EvEJS Local Development CA/);
  assert.equal(certificateIsSignedByCa(xmppCertPath, caCertPath), true);
  assert.equal(certificateIsSignedByCa(gatewayCertPath, caCertPath), true);
  assert.equal(certificateHasAltNames(xmppCertPath, ["localhost"], ["127.0.0.1"]), true);
  assert.equal(
    certificateHasAltNames(
      gatewayCertPath,
      ["dev-public-gateway.evetech.net", "public-gateway.evetech.net", "localhost"],
      ["127.0.0.1"],
    ),
    true,
  );
});
