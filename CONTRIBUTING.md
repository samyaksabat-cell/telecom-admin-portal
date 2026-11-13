# Issue triage

The managed label catalog is [`.github/labels.json`](.github/labels.json).
For each triaged issue, apply **exactly one priority**, **exactly one type**, and
**one or more areas**. A new issue may be unlabeled until triage; do not guess a
priority from its template. These conventions also work for pull requests.

## Priority

| Label         | When to use                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `priority:P0` | Critical outage, data loss, or security emergency. Address immediately.   |
| `priority:P1` | A major workflow is blocked with no reasonable workaround. Take next.     |
| `priority:P2` | Normal defect with a workaround or useful improvement. Schedule normally. |
| `priority:P3` | Minor polish or optional improvement. Take when capacity permits.         |

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not
in a public issue.

## Type and area

- `type:bug`: incorrect or regressed behavior.
- `type:feature`: a new capability or enhancement.
- `type:chore`: maintenance, documentation, dependencies, or tooling.
- `area:frontend`: `app/`, `components/`, `hooks/`, `lib/`, frontend unit tests,
  and browser tests.
- `area:backend`: `backend/`, API tests, SQLite persistence, and database seeding.
- `area:infra`: `.github/`, `.devcontainer/`, build tooling and runtime setup.
- `area:docs`: README, guides, API documentation, and other written documentation.

Use multiple area labels for cross-stack work. For example, a broken customer
edit flow spanning React and the API could be `priority:P1`, `type:bug`,
`area:frontend`, and `area:backend`. A guide update might be `priority:P3`,
`type:chore`, and `area:docs`. Reassess priority when impact or workarounds change,
replacing the old priority rather than adding another.

Bug and feature forms assign the corresponding type label. Maintainers verify
the type and assign priority and areas after reviewing impact. Blank issues and
maintenance tasks need all three categories assigned manually. Existing GitHub
defaults are preserved for compatibility, but use the prefixed taxonomy for new
triage. During normal backlog triage, replace `bug` with `type:bug` and
`enhancement` with `type:feature`; keep supplemental labels such as `help wanted`,
`good first issue`, and `accessibility` as appropriate. No existing issues are
bulk relabeled.

## Filtering work

Use GitHub issue search, for example:

```text
is:issue is:open label:"priority:P1" label:"area:backend"
is:issue is:open label:"type:bug" label:"area:frontend"
```

The same filters work with `gh issue list --search '...'`.

## Maintaining the catalog

Edit the catalog in a pull request. Each entry has a unique name, a six-digit hex
color without `#`, and a description of at most 100 characters. Keep P0-P3, the
three types, and the frontend/backend/infra areas. Add areas only when they have
a distinct ownership boundary.

The **Issue labels** workflow validates changes on pull requests without write
permissions. On merge to `main`, it creates missing labels and updates managed
colors/descriptions. Maintainers can run it manually on `main` to repair drift.
It never deletes labels or changes issue assignments. Removing an entry stops
managing it; a rename creates a new label, so migrate existing issues deliberately.

Run the dependency-free regression checks locally with Node.js 22+:

```bash
node --test .github/scripts/sync-labels.test.mjs
```

For an initial setup or manual repair, a maintainer with GitHub CLI authenticated
and repository label-write permission can run:

```bash
GH_TOKEN="$(gh auth token)" \
  GITHUB_REPOSITORY=samyaksabat-cell/telecom-admin-portal \
  node .github/scripts/sync-labels.mjs
```
