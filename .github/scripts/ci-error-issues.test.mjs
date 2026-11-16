import assert from "node:assert/strict"
import test from "node:test"
import { syncCiIssues } from "./ci-error-issues.mjs"

function fixture() {
  const run = {
    id: 101,
    run_number: 12,
    run_attempt: 1,
    workflow_id: 7,
    event: "push",
    path: ".github/workflows/ci.yml",
    head_repository: { full_name: "example/telecom" },
    head_branch: "main",
    head_sha: "abc123",
    html_url: "https://github.com/example/telecom/actions/runs/101",
    status: "completed",
    conclusion: "failure",
  }
  const state = {
    issues: [],
    writes: [],
    reads: [],
    latest: run,
    jobs: [
      {
        name: "Backend",
        conclusion: "failure",
        html_url: `${run.html_url}/job/5`,
        steps: [{ name: "Test with coverage", conclusion: "failure" }],
      },
    ],
  }
  const context = {
    repo: { owner: "example", repo: "telecom" },
    payload: {
      repository: { full_name: "example/telecom", default_branch: "main" },
      workflow_run: run,
    },
  }
  const github = {
    rest: {
      actions: {
        listWorkflowRuns: async (args) => {
          state.reads.push(args)
          return { data: { workflow_runs: [state.latest] } }
        },
        listJobsForWorkflowRunAttempt: "jobs",
      },
      issues: {
        listForRepo: "issues",
        create: async (args) => {
          state.writes.push({ operation: "create", ...args })
          const issue = { number: state.issues.length + 1, state: "open", ...args }
          state.issues.push(issue)
          return { data: issue }
        },
        update: async (args) => {
          state.writes.push({ operation: "update", ...args })
          const issue = state.issues.find((item) => item.number === args.issue_number)
          Object.assign(issue, args)
          return { data: issue }
        },
      },
    },
    paginate: async (endpoint, args) => {
      state.reads.push(args)
      if (endpoint === "jobs") return state.jobs
      // Return a separate array, as the real API does.
      if (endpoint === "issues") return [...state.issues]
      throw new Error("Unexpected endpoint")
    },
  }
  return { run, context, github, state, sync: () => syncCiIssues({ github, context }) }
}

test("failure creates an actionable issue without copying logs or artifacts", async () => {
  const f = fixture()
  f.state.jobs[0].logs = "sensitive raw log content"
  await f.sync()
  assert.equal(f.state.issues.length, 1)
  const issue = f.state.issues[0]
  assert.equal(issue.title, "[CI error] Backend")
  for (const expected of [
    "abc123",
    "Test with coverage",
    "Reproduce",
    "README.md",
    f.run.html_url,
    f.state.jobs[0].html_url,
  ])
    assert.ok(issue.body.includes(expected), expected)
  assert.ok(!issue.body.includes("sensitive raw log content"))
  assert.equal(f.state.reads[1].attempt_number, 1)
  assert.equal(f.state.reads[2].state, "all")
  assert.equal(f.state.reads[2].creator, "github-actions[bot]")
})

test("delivery replay is idempotent and repeated failures update one issue", async () => {
  const f = fixture()
  await f.sync()
  await f.sync()
  assert.equal(f.state.writes.length, 1)
  f.run.id++
  f.run.run_number++
  await f.sync()
  assert.equal(f.state.issues.length, 1)
  assert.equal(f.state.writes[1].operation, "update")
  assert.ok(f.state.issues[0].body.includes("Run 13"))
})

test("recovery closes the issue, replay is harmless, recurrence reopens it", async () => {
  const f = fixture()
  await f.sync()
  f.run.run_attempt = 2
  f.run.conclusion = "success"
  f.state.jobs[0].conclusion = "success"
  await f.sync()
  assert.equal(f.state.issues[0].state, "closed")
  assert.ok(f.state.issues[0].body.includes("Recovered in"))
  assert.ok(f.state.issues[0].body.includes("attempt 2"))
  await f.sync()
  assert.equal(f.state.writes.length, 2)
  f.run.id++
  f.run.run_attempt = 1
  f.run.conclusion = "failure"
  f.state.jobs[0].conclusion = "failure"
  await f.sync()
  assert.equal(f.state.issues.length, 1)
  assert.equal(f.state.issues[0].state, "open")
})

test("jobs are independent, successes close even if another job fails", async () => {
  const f = fixture()
  f.state.jobs.push({ name: "Frontend", conclusion: "timed_out", steps: [] })
  await f.sync()
  assert.equal(f.state.issues.length, 2)
  assert.ok(f.state.issues[1].body.includes("No failed step was reported"))
  f.run.id++
  f.state.jobs[0].conclusion = "success"
  await f.sync()
  assert.equal(f.state.issues[0].state, "closed")
  assert.equal(f.state.issues[1].state, "open")
})

for (const conclusion of ["cancelled", "skipped", "neutral", null]) {
  test(`${conclusion} jobs do not close existing incidents`, async () => {
    const f = fixture()
    await f.sync()
    f.run.id++
    f.state.jobs[0].conclusion = conclusion
    await f.sync()
    assert.equal(f.state.writes.length, 1)
    assert.equal(f.state.issues[0].state, "open")
  })
}

test("healthy runs never create issues", async () => {
  const f = fixture()
  f.run.conclusion = "success"
  f.state.jobs[0].conclusion = "success"
  await f.sync()
  assert.deepEqual(f.state.writes, [])
})

for (const patch of [
  { event: "pull_request" },
  { head_repository: { full_name: "fork/telecom" } },
  { head_repository: null },
  { head_branch: "feature" },
  { path: ".github/workflows/other.yml" },
  { status: "in_progress" },
  { conclusion: "cancelled" },
]) {
  test(`untrusted or irrelevant run is ignored: ${JSON.stringify(patch)}`, async () => {
    const f = fixture()
    Object.assign(f.run, patch)
    await f.sync()
    assert.deepEqual(f.state.reads, [])
    assert.deepEqual(f.state.writes, [])
  })
}

test("older runs and older attempts cannot overwrite newer results", async () => {
  const f = fixture()
  f.state.latest = { ...f.run, id: 102, status: "in_progress" }
  await f.sync()
  f.state.latest = { ...f.run, run_attempt: 2 }
  await f.sync()
  assert.deepEqual(f.state.writes, [])
})

test("unrelated issues and pull requests are not modified", async () => {
  const f = fixture()
  f.state.issues.push({ number: 1, title: "[CI error] Backend", body: "User issue" })
  f.state.issues.push({
    number: 2,
    body: "<!-- ci-error:QmFja2VuZA -->",
    pull_request: {},
  })
  await f.sync()
  assert.equal(f.state.writes[0].operation, "create")
  assert.equal(f.state.issues[0].body, "User issue")
})

test("API failures propagate so automation failures are visible", async () => {
  const f = fixture()
  f.github.rest.issues.create = async () => {
    throw new Error("Issues disabled")
  }
  await assert.rejects(f.sync, /Issues disabled/)
})
