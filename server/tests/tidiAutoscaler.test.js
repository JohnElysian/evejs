const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..");
const tidiAutoscaler = require(path.join(
  repoRoot,
  "server/src/utils/tidiAutoscaler",
));

function buildMetrics(factor) {
  return {
    endedAtMonotonicMs: 1000,
    factor,
    avgActualIntervalMs: factor >= 1.0 ? 100 : 100 / factor,
    avgTickDurationMs: factor >= 1.0 ? 20 : 100 / factor,
    maxLatenessMs: factor >= 1.0 ? 0 : (100 / factor) - 100,
    sceneCount: 1,
  };
}

function buildOptions() {
  return {
    logChange: false,
    schedule: false,
  };
}

test.afterEach(() => {
  tidiAutoscaler._testing.resetState();
});

test("autoscaler tightens TiDi directly to the target factor", () => {
  const options = buildOptions();

  const result = tidiAutoscaler._testing.evaluateWindowMetrics(
    buildMetrics(0.1),
    options,
  );
  assert.equal(result.changed, true);
  assert.equal(result.reason, "tighten");
  assert.equal(result.targetFactor, 0.1);
  assert.equal(tidiAutoscaler._testing.getCurrentFactor(), 0.1);
});

test("autoscaler requires two low-load polls before relaxing TiDi to the target factor", () => {
  const options = buildOptions();

  tidiAutoscaler._testing.evaluateWindowMetrics(buildMetrics(0.1), options);
  assert.equal(tidiAutoscaler._testing.getCurrentFactor(), 0.1);

  const firstRelaxAttempt = tidiAutoscaler._testing.evaluateWindowMetrics(
    buildMetrics(1.0),
    options,
  );
  assert.equal(firstRelaxAttempt.changed, false);
  assert.equal(firstRelaxAttempt.reason, "await-relax-confirmation");
  assert.equal(firstRelaxAttempt.targetFactor, 1.0);
  assert.equal(tidiAutoscaler._testing.getCurrentFactor(), 0.1);
  assert.equal(tidiAutoscaler._testing.getPendingRelaxFactor(), 1.0);
  assert.equal(tidiAutoscaler._testing.getPendingRelaxWindows(), 1);

  const secondRelaxAttempt = tidiAutoscaler._testing.evaluateWindowMetrics(
    buildMetrics(1.0),
    options,
  );
  assert.equal(secondRelaxAttempt.changed, true);
  assert.equal(secondRelaxAttempt.reason, "relax");
  assert.equal(secondRelaxAttempt.targetFactor, 1.0);
  assert.equal(tidiAutoscaler._testing.getCurrentFactor(), 1.0);
  assert.equal(tidiAutoscaler._testing.getPendingRelaxFactor(), null);
  assert.equal(tidiAutoscaler._testing.getPendingRelaxWindows(), 0);
});

test("autoscaler clears a pending relax if load rises back to the current factor", () => {
  const options = buildOptions();

  tidiAutoscaler._testing.evaluateWindowMetrics(buildMetrics(0.1), options);
  tidiAutoscaler._testing.evaluateWindowMetrics(buildMetrics(1.0), options);

  const stableAtCurrentFactor = tidiAutoscaler._testing.evaluateWindowMetrics(
    buildMetrics(0.1),
    options,
  );
  assert.equal(stableAtCurrentFactor.changed, false);
  assert.equal(stableAtCurrentFactor.reason, "stable");
  assert.equal(stableAtCurrentFactor.targetFactor, 0.1);
  assert.equal(tidiAutoscaler._testing.getPendingRelaxWindows(), 0);
  assert.equal(tidiAutoscaler._testing.getPendingRelaxFactor(), null);

  const nextRelaxAttempt = tidiAutoscaler._testing.evaluateWindowMetrics(
    buildMetrics(1.0),
    options,
  );
  assert.equal(nextRelaxAttempt.changed, false);
  assert.equal(nextRelaxAttempt.reason, "await-relax-confirmation");
  assert.equal(nextRelaxAttempt.targetFactor, 1.0);
  assert.equal(tidiAutoscaler._testing.getPendingRelaxWindows(), 1);
  assert.equal(tidiAutoscaler._testing.getPendingRelaxFactor(), 1.0);
});
