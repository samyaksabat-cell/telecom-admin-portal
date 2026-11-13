import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

export function validateLabels(labels) {
  if (!Array.isArray(labels) || labels.length === 0) {
    throw new Error("Label catalog must be a nonempty array")
  }
  const names = new Set()
  for (const label of labels) {
    if (
      !label ||
      typeof label.name !== "string" ||
      !/^(priority:P[0-3]|type:[a-z]+|area:[a-z]+)$/.test(label.name) ||
      typeof label.color !== "string" ||
      !/^[0-9a-f]{6}$/.test(label.color) ||
      typeof label.description !== "string" ||
      !label.description.trim() ||
      label.description.length > 100
    ) {
      throw new Error(
        "Each label needs a taxonomy name, six-digit color, and description (1-100 characters)"
      )
    }
    if (names.has(label.name.toLowerCase())) {
      throw new Error(`Duplicate label: ${label.name}`)
    }
    names.add(label.name.toLowerCase())
  }
  for (const name of [
    "priority:P0",
    "priority:P1",
    "priority:P2",
    "priority:P3",
    "type:bug",
    "type:feature",
    "type:chore",
    "area:frontend",
    "area:backend",
    "area:infra",
  ]) {
    if (!names.has(name.toLowerCase())) throw new Error(`Missing required label: ${name}`)
  }
}

const runGh = (args) => execFileSync("gh", args, { encoding: "utf8" })

// Only upsert catalog entries. Never remove labels or alter issue assignments.
export function syncLabels(repository, labels, gh = runGh) {
  validateLabels(labels)
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Expected owner/repository")
  const endpoint = `repos/${repository}/labels`
  const existing = JSON.parse(
    gh(["api", "--paginate", "--slurp", `${endpoint}?per_page=100`])
  ).flat()
  let changed = 0
  for (const label of labels) {
    const current = existing.find((item) => item.name.toLowerCase() === label.name.toLowerCase())
    if (
      current?.name === label.name &&
      current.color.toLowerCase() === label.color &&
      current.description === label.description
    )
      continue
    gh([
      "api",
      "--method",
      current ? "PATCH" : "POST",
      current ? `${endpoint}/${encodeURIComponent(current.name)}` : endpoint,
      "-f",
      `name=${label.name}`,
      "-f",
      `color=${label.color}`,
      "-f",
      `description=${label.description}`,
    ])
    changed++
  }
  return changed
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const labels = JSON.parse(readFileSync(new URL("../labels.json", import.meta.url), "utf8"))
  const changed = syncLabels(process.env.GITHUB_REPOSITORY, labels)
  console.log(`Synchronized labels: ${changed} created or updated; no labels deleted.`)
}
