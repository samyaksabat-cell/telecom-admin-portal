import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { syncLabels, validateLabels } from "./sync-labels.mjs"

const labels = JSON.parse(readFileSync(new URL("../labels.json", import.meta.url), "utf8"))

test("catalog defines all required priority, type, and area labels", () => {
  assert.doesNotThrow(() => validateLabels(labels))
})

test("rejects malformed, duplicate, or incomplete catalogs before any API calls", () => {
  const invalid = [
    [],
    [...labels, labels[0]],
    labels.filter((label) => label.name !== "priority:P0"),
    labels.map((label, i) => (i ? label : { ...label, color: "#ffffff" })),
    labels.map((label, i) => (i ? label : { ...label, color: 123456 })),
    labels.map((label, i) => (i ? label : { ...label, description: "" })),
    labels.map((label, i) => (i ? label : { ...label, description: "x".repeat(101) })),
    labels.map((label, i) => (i ? label : { ...label, name: "unknown:value" })),
  ]
  for (const catalog of invalid) {
    assert.throws(() => syncLabels("owner/repo", catalog, () => assert.fail("Unexpected API call")))
  }
  assert.throws(() => syncLabels(undefined, labels, () => assert.fail("Unexpected API call")))
})

test("creates missing labels, updates drift, preserves unrelated labels, and is idempotent", () => {
  const unrelated = { name: "help wanted", color: "008672", description: "Community help" }
  const store = [
    { ...unrelated },
    { ...labels[0], name: "Priority:P0", color: "ffffff", description: "Outdated" },
    { ...labels[1] },
  ]
  const writes = []
  const gh = (args) => {
    if (args.includes("--paginate")) {
      assert.ok(args.includes("--slurp"))
      // Simulate multiple GitHub API pages.
      return JSON.stringify([store.slice(0, 2), store.slice(2)])
    }
    const method = args[2]
    const endpoint = args[3]
    assert.ok(["POST", "PATCH"].includes(method))
    const label = Object.fromEntries(
      args
        .filter((value, i) => args[i - 1] === "-f")
        .map((value) => {
          const split = value.indexOf("=")
          return [value.slice(0, split), value.slice(split + 1)]
        })
    )
    if (method === "PATCH") {
      const name = decodeURIComponent(endpoint.split("/").at(-1))
      Object.assign(
        store.find((item) => item.name === name),
        label
      )
    } else {
      store.push(label)
    }
    writes.push({ method, endpoint })
    return "{}"
  }
  assert.equal(syncLabels("owner/repo", labels, gh), labels.length - 1)
  assert.equal(writes.filter((write) => write.method === "PATCH").length, 1)
  assert.ok(writes[0].endpoint.endsWith("Priority%3AP0"))
  assert.deepEqual(
    store.find((label) => label.name === unrelated.name),
    unrelated
  )
  for (const label of labels)
    assert.deepEqual(
      store.find((item) => item.name === label.name),
      label
    )
  writes.length = 0
  assert.equal(syncLabels("owner/repo", labels, gh), 0)
  assert.equal(writes.length, 0)
})

test("API errors fail the sync rather than reporting success", () => {
  assert.throws(
    () =>
      syncLabels("owner/repo", labels, () => {
        throw new Error("Forbidden")
      }),
    /Forbidden/
  )
  assert.throws(
    () =>
      syncLabels("owner/repo", labels, (args) => {
        if (args.includes("--paginate")) return "[[]]"
        throw new Error("Write denied")
      }),
    /Write denied/
  )
})
