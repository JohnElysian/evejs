const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..", "..");
const {
  certificateHasAltNames,
  ensureLocalCerts,
} = require(path.join(repoRoot, "tools", "LocalCerts", "ensure-local-certs.js"));

function readFirstCertificate(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const match = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/.exec(raw);
  return match ? match[0] : raw;
}

test("local certificate bootstrap creates CA, XMPP, and gateway certs without committed cert material", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "evejs-local-certs-"));
  const first = ensureLocalCerts({ repoRoot: tempRoot });

  for (const filePath of Object.values(first.paths)) {
    assert.equal(fs.existsSync(filePath), true, filePath);
  }
  assert.equal(first.rebuilt.ca, true);
  assert.equal(first.rebuilt.xmpp, true);
  assert.equal(first.rebuilt.gateway, true);

  assert.equal(
    certificateHasAltNames(first.paths.xmppCertPath, ["localhost"], ["127.0.0.1"]),
    true,
  );
  assert.equal(
    certificateHasAltNames(
      first.paths.gatewayCertPath,
      ["dev-public-gateway.evetech.net", "public-gateway.evetech.net", "localhost"],
      ["127.0.0.1"],
    ),
    true,
  );

  const ca = new crypto.X509Certificate(readFirstCertificate(first.paths.caCertPath));
  assert.match(ca.subject, /EvEJS Local Development CA/);

  const second = ensureLocalCerts({ repoRoot: tempRoot });
  assert.deepEqual(second.rebuilt, {
    ca: false,
    xmpp: false,
    gateway: false,
  });
});
