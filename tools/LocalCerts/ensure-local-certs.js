#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DEFAULT_REPO_ROOT = path.resolve(__dirname, "..", "..");
let forge = null;

function loadForge(repoRoot = DEFAULT_REPO_ROOT) {
  if (forge) {
    return forge;
  }
  try {
    forge = require("node-forge");
  } catch {
    const roots = [...new Set([repoRoot, DEFAULT_REPO_ROOT])];
    let lastError = null;
    for (const root of roots) {
      try {
        forge = require(path.join(root, "server", "node_modules", "node-forge"));
        return forge;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
  return forge;
}

function parseArgs(argv) {
  const options = {
    repoRoot: process.env.EVEJS_REPO_ROOT || DEFAULT_REPO_ROOT,
    force: false,
    quiet: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--force") {
      options.force = true;
      continue;
    }
    if (token === "--quiet") {
      options.quiet = true;
      continue;
    }
    if (token === "--repo-root") {
      options.repoRoot = argv[++index];
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  options.repoRoot = path.resolve(options.repoRoot);
  return options;
}

function getDefaultCertPaths(repoRoot) {
  return {
    caCertPath: path.join(repoRoot, "server", "certs", "xmpp-ca-cert.pem"),
    caKeyPath: path.join(repoRoot, "server", "certs", "xmpp-ca-key.pem"),
    xmppCertPath: path.join(repoRoot, "server", "certs", "xmpp-dev-cert.pem"),
    xmppKeyPath: path.join(repoRoot, "server", "certs", "xmpp-dev-key.pem"),
    gatewayCertPath: path.join(
      repoRoot,
      "server",
      "src",
      "_secondary",
      "express",
      "certs",
      "gateway-dev-cert.pem",
    ),
    gatewayKeyPath: path.join(
      repoRoot,
      "server",
      "src",
      "_secondary",
      "express",
      "certs",
      "gateway-dev-key.pem",
    ),
  };
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function randomSerialNumber(localForge) {
  const hex = localForge.util.bytesToHex(localForge.random.getBytesSync(16));
  return hex.replace(/^0+/, "") || "01";
}

function makeValidity(years) {
  const now = new Date();
  const notBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const notAfter = new Date(now.getTime());
  notAfter.setFullYear(notAfter.getFullYear() + years);
  return { notBefore, notAfter };
}

function firstCertificatePem(pemText) {
  const match = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/.exec(
    String(pemText || ""),
  );
  return match ? match[0] : "";
}

function certificateHasAltNames(certPath, dnsNames, ipNames) {
  try {
    const certPem = firstCertificatePem(fs.readFileSync(certPath, "utf8"));
    const x509 = new crypto.X509Certificate(certPem);
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
  } catch {
    return false;
  }
}

function writePem(filePath, contents) {
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, `${String(contents || "").trim()}\n`, "utf8");
}

function createCertificateAuthority(paths, repoRoot) {
  const localForge = loadForge(repoRoot);
  const keyPair = localForge.pki.rsa.generateKeyPair(2048);
  const cert = localForge.pki.createCertificate();
  const validity = makeValidity(20);

  cert.publicKey = keyPair.publicKey;
  cert.serialNumber = randomSerialNumber(localForge);
  cert.validity.notBefore = validity.notBefore;
  cert.validity.notAfter = validity.notAfter;
  cert.setSubject([
    { name: "organizationName", value: "EvEJS Local" },
    { name: "commonName", value: "EvEJS Local Development CA" },
  ]);
  cert.setIssuer(cert.subject.attributes);
  cert.setExtensions([
    { name: "basicConstraints", cA: true, critical: true },
    {
      name: "keyUsage",
      keyCertSign: true,
      cRLSign: true,
      digitalSignature: true,
      critical: true,
    },
    { name: "subjectKeyIdentifier" },
  ]);
  cert.sign(keyPair.privateKey, localForge.md.sha256.create());

  writePem(paths.caCertPath, localForge.pki.certificateToPem(cert));
  writePem(paths.caKeyPath, localForge.pki.privateKeyToPem(keyPair.privateKey));

  return {
    cert,
    key: keyPair.privateKey,
    certPem: fs.readFileSync(paths.caCertPath, "utf8").trim(),
    rebuilt: true,
  };
}

function readCertificateAuthority(paths, repoRoot) {
  const localForge = loadForge(repoRoot);
  return {
    cert: localForge.pki.certificateFromPem(fs.readFileSync(paths.caCertPath, "utf8")),
    key: localForge.pki.privateKeyFromPem(fs.readFileSync(paths.caKeyPath, "utf8")),
    certPem: fs.readFileSync(paths.caCertPath, "utf8").trim(),
    rebuilt: false,
  };
}

function ensureCertificateAuthority(paths, repoRoot, force) {
  if (!force && fs.existsSync(paths.caCertPath) && fs.existsSync(paths.caKeyPath)) {
    try {
      return readCertificateAuthority(paths, repoRoot);
    } catch {
      return createCertificateAuthority(paths, repoRoot);
    }
  }
  return createCertificateAuthority(paths, repoRoot);
}

function createLeafCertificate(options) {
  const localForge = loadForge(options.repoRoot);
  const keyPair = localForge.pki.rsa.generateKeyPair(2048);
  const cert = localForge.pki.createCertificate();
  const validity = makeValidity(10);

  cert.publicKey = keyPair.publicKey;
  cert.serialNumber = randomSerialNumber(localForge);
  cert.validity.notBefore = validity.notBefore;
  cert.validity.notAfter = validity.notAfter;
  cert.setSubject([{ name: "commonName", value: options.commonName }]);
  cert.setIssuer(options.ca.cert.subject.attributes);
  cert.setExtensions([
    { name: "basicConstraints", cA: false, critical: true },
    {
      name: "keyUsage",
      digitalSignature: true,
      keyEncipherment: true,
      critical: true,
    },
    { name: "extKeyUsage", serverAuth: true, critical: true },
    {
      name: "subjectAltName",
      altNames: [
        ...options.dnsNames.map((value) => ({ type: 2, value })),
        ...options.ipNames.map((ip) => ({ type: 7, ip })),
      ],
    },
    { name: "subjectKeyIdentifier" },
  ]);
  cert.sign(options.ca.key, localForge.md.sha256.create());

  writePem(
    options.certPath,
    `${localForge.pki.certificateToPem(cert).trim()}\n${options.ca.certPem}`,
  );
  writePem(options.keyPath, localForge.pki.privateKeyToPem(keyPair.privateKey));
}

function ensureLeafCertificate(options) {
  const exists =
    fs.existsSync(options.certPath) &&
    fs.existsSync(options.keyPath) &&
    certificateHasAltNames(options.certPath, options.dnsNames, options.ipNames);
  if (!options.force && exists) {
    return false;
  }
  createLeafCertificate(options);
  return true;
}

function ensureLocalCerts(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || DEFAULT_REPO_ROOT);
  const paths = getDefaultCertPaths(repoRoot);
  const force = options.force === true;
  const ca = ensureCertificateAuthority(paths, repoRoot, force);

  const rebuilt = {
    ca: ca.rebuilt,
    xmpp: ensureLeafCertificate({
      repoRoot,
      ca,
      certPath: paths.xmppCertPath,
      keyPath: paths.xmppKeyPath,
      commonName: "localhost",
      dnsNames: ["localhost"],
      ipNames: ["127.0.0.1"],
      force,
    }),
    gateway: ensureLeafCertificate({
      repoRoot,
      ca,
      certPath: paths.gatewayCertPath,
      keyPath: paths.gatewayKeyPath,
      commonName: "dev-public-gateway.evetech.net",
      dnsNames: [
        "dev-public-gateway.evetech.net",
        "public-gateway.evetech.net",
        "localhost",
      ],
      ipNames: ["127.0.0.1"],
      force,
    }),
  };

  return { repoRoot, paths, rebuilt };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = ensureLocalCerts(options);
  if (!options.quiet) {
    const rebuilt = Object.entries(result.rebuilt)
      .filter((entry) => entry[1])
      .map((entry) => entry[0]);
    const suffix = rebuilt.length ? ` rebuilt=${rebuilt.join(",")}` : " already-ready";
    console.log(`[EvEJS certs] Local certificates ready.${suffix}`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[EvEJS certs] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  certificateHasAltNames,
  ensureLocalCerts,
  getDefaultCertPaths,
};
