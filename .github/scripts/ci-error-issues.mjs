const failures = new Set(["failure", "timed_out", "startup_failure"])

// Only metadata is copied to issues. Logs and artifacts can contain sensitive data.
export async function syncCiIssues({ github, context }) {
  const run = context.payload.workflow_run
  const repository = context.payload.repository
  const repo = context.repo
  if (
    !run ||
    run.event !== "push" ||
    run.head_repository?.full_name !== repository.full_name ||
    run.head_branch !== repository.default_branch ||
    run.path !== ".github/workflows/ci.yml" ||
    run.status !== "completed" ||
    (!failures.has(run.conclusion) && run.conclusion !== "success")
  ) {
    return
  }

  // Delayed deliveries must not reopen an incident after a newer run recovers.
  const latest = await github.rest.actions.listWorkflowRuns({
    ...repo,
    workflow_id: run.workflow_id,
    branch: repository.default_branch,
    event: "push",
    per_page: 1,
  })
  if (
    latest.data.workflow_runs[0]?.id !== run.id ||
    latest.data.workflow_runs[0]?.run_attempt !== run.run_attempt
  ) {
    return
  }

  const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRunAttempt, {
    ...repo,
    run_id: run.id,
    attempt_number: run.run_attempt,
    per_page: 100,
  })
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    ...repo,
    state: "all",
    creator: "github-actions[bot]",
    per_page: 100,
  })
  const delivery = `<!-- ci-run:${run.id}:${run.run_attempt} -->`

  for (const job of jobs) {
    if (!failures.has(job.conclusion) && job.conclusion !== "success") continue
    const marker = `<!-- ci-error:${Buffer.from(job.name).toString("base64url")} -->`
    const issue = issues.find((item) => !item.pull_request && item.body?.startsWith(marker))
    if (issue?.body?.includes(delivery)) continue

    if (job.conclusion === "success") {
      if (issue?.state === "open") {
        await github.rest.issues.update({
          ...repo,
          issue_number: issue.number,
          state: "closed",
          state_reason: "completed",
          body: `${issue.body}\n\nRecovered in [CI run ${run.run_number}, attempt ${run.run_attempt}](${job.html_url}).\n${delivery}`,
        })
      }
      continue
    }

    const failedSteps = (job.steps ?? [])
      .filter((step) => failures.has(step.conclusion))
      .map((step) => `- ${step.name}`)
      .join("\n")
    const body = [
      marker,
      `Default-branch CI detected **${job.conclusion}** in **${job.name}**.`,
      `- Branch: \`${run.head_branch}\``,
      `- Commit: ${run.head_sha}`,
      `- [Failed job and logs](${job.html_url})`,
      `- [Run ${run.run_number}, attempt ${run.run_attempt}, and test artifacts](${run.html_url})`,
      "### Failed steps",
      failedSteps || "No failed step was reported. Inspect runner setup and job logs.",
      "### Triage",
      "1. Open the failed job, inspect the first failing step, and download available test/coverage or Playwright reports from the run.",
      "2. Reproduce the failing command at the commit above using the setup in README.md.",
      "3. Fix the failure or rerun a transient failure. This issue closes when this job succeeds on the latest default-branch push run (including reruns).",
      "Repeated failures update this issue; a recurrence reopens it. Cancelled and skipped jobs do not resolve incidents. Logs and artifact contents are never copied here.",
      delivery,
    ].join("\n\n")
    const fields = { ...repo, title: `[CI error] ${job.name}`, body }
    if (issue) {
      await github.rest.issues.update({
        ...fields,
        issue_number: issue.number,
        state: "open",
        state_reason: "reopened",
      })
    } else {
      const created = await github.rest.issues.create(fields)
      issues.push(created.data)
    }
  }
}
