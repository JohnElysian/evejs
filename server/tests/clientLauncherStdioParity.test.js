const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(__dirname, "..", "..", ...segments), "utf8");
}

function readRepoFileIfPresent(...segments) {
  const filePath = path.join(__dirname, "..", "..", ...segments);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

test("Play launchers bind client stdio to stable non-device sinks", () => {
  const playBat = readRepoFile("Play.bat");
  const playDebugBat = readRepoFile("PlayDebug.bat");
  const runClientProxyBat = readRepoFileIfPresent("scripts", "windows", "RunClientProxy.bat");

  assert.match(playBat, /EVEJS_CLIENT_STDIO_LOG=%TEMP%\\evejs-client-stdout-/i);
  assert.match(playBat, /"%CLIENT_EXE%"\s+1>>"%EVEJS_CLIENT_STDIO_LOG%"\s+2>&1/i);
  assert.match(playBat, /set "EO_REMOTEFILECACHEFOLDER=%EVEJS_CLIENT_RESFILES%"/i);
  assert.match(playBat, /echo\s+ResFiles:\s+%EO_REMOTEFILECACHEFOLDER%/i);
  assert.match(playBat, /EVEJS_PROXY_BLOCKED_HOSTS=api\.ipify\.org,sentry\.io,\.sentry\.io,.*launchdarkly\.com,\.launchdarkly\.com/i);
  assert.match(playBat, /if "%EVEJS_DRY_RUN%"=="1"/i);
  assert.match(playDebugBat, /"%CLIENT_EXE%"\s+\/console/i);
  assert.doesNotMatch(playDebugBat, /^"%CLIENT_EXE%"\s+\/console\s+.*(?:1>|2>)/im);
  assert.match(playDebugBat, /set "EO_REMOTEFILECACHEFOLDER=%EVEJS_CLIENT_RESFILES%"/i);
  assert.match(playDebugBat, /echo\s+ResFiles:\s+%EO_REMOTEFILECACHEFOLDER%/i);
  assert.match(playDebugBat, /EVEJS_PROXY_BLOCKED_HOSTS=api\.ipify\.org,sentry\.io,\.sentry\.io,.*launchdarkly\.com,\.launchdarkly\.com/i);

  if (runClientProxyBat) {
    assert.match(runClientProxyBat, /EVEJS_CLIENT_STDIO_LOG=%TEMP%\\evejs-client-stdout-/i);
    assert.match(runClientProxyBat, /"%CLIENT_EXE%"\s+1>>"%EVEJS_CLIENT_STDIO_LOG%"\s+2>&1/i);
    assert.match(runClientProxyBat, /EVEJS_PROXY_BLOCKED_HOSTS=api\.ipify\.org,sentry\.io,\.sentry\.io,.*launchdarkly\.com,\.launchdarkly\.com/i);
  }
});

test("PlayerConnect launcher redirects and drains client stdio", () => {
  const playerConnectClient = readRepoFileIfPresent(
    "tools",
    "PlayerConnect",
    "assets",
    "PlayerConnectClient.cs",
  );

  if (!playerConnectClient) {
    return;
  }

  assert.match(playerConnectClient, /RedirectStandardOutput\s*=\s*true\s*;/);
  assert.match(playerConnectClient, /RedirectStandardError\s*=\s*true\s*;/);
  assert.match(playerConnectClient, /BeginOutputReadLine\s*\(\s*\)\s*;/);
  assert.match(playerConnectClient, /BeginErrorReadLine\s*\(\s*\)\s*;/);
});

test("PlayerConnect local proxy enforces telemetry blocked hosts", () => {
  const playerConnectClient = readRepoFileIfPresent(
    "tools",
    "PlayerConnect",
    "assets",
    "PlayerConnectClient.cs",
  );
  const playerBundleBuilder = readRepoFileIfPresent(
    "tools",
    "PlayerConnect",
    "scripts",
    "build-player-bundle.ps1",
  );

  if (!playerConnectClient || !playerBundleBuilder) {
    return;
  }

  const playerConnectGui = readRepoFileIfPresent("tools", "PlayerConnect", "PlayerConnect.ps1");

  assert.match(playerConnectClient, /ProxyBlockedHosts\s*=\s*"api\.ipify\.org,sentry\.io,\.sentry\.io,launchdarkly\.com,\.launchdarkly\.com"/);
  assert.match(playerConnectClient, /this\.blockedHosts\s*=\s*ParseBlockedHosts\(proxyBlockedHostsValue\)\s*;/);
  assert.match(playerConnectClient, /if\s*\(\s*this\.IsBlockedHost\(host\)\s*\)/);
  assert.match(playerConnectClient, /if\s*\(\s*this\.IsBlockedHost\(targetUri\.Host\)\s*\)/);
  assert.match(playerConnectClient, /WritePlainResponse\(clientStream,\s*403,\s*"Forbidden",\s*"Blocked by EveJS Elysian Player Connect policy\."\)/);
  assert.match(playerBundleBuilder, /\[string\]\$ProxyBlockedHosts\s*=\s*"api\.ipify\.org,sentry\.io,\.sentry\.io,launchdarkly\.com,\.launchdarkly\.com"/);
  assert.match(playerBundleBuilder, /ProxyBlockedHosts\s*=\s*\$ProxyBlockedHosts/);
  if (playerConnectGui) {
    assert.match(playerConnectGui, /"-ProxyBlockedHosts",\s*\$snapshot\.values\.proxyBlockedHosts/);
  }
});
