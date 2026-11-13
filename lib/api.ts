export async function requireOk(response: Response, fallback: string): Promise<void> {
  if (response.ok) return
  let message = fallback
  try {
    const body = await response.json()
    if (typeof body?.detail === "string" && body.detail.trim()) message = body.detail
  } catch {
    // Empty/non-JSON error responses still need a useful message.
  }
  throw new Error(message)
}

// Collection endpoints retain array bodies and advertise continuation in headers.
export async function fetchCollection<T>(url: string, failureMessage: string): Promise<T[]> {
  const records: T[] = []
  for (let page = 0; ; page += 1) {
    const response = await fetch(page === 0 ? url : `${url}?page=${page}`)
    await requireOk(response, failureMessage)
    records.push(...(await response.json()))
    if (response.headers?.get("X-Has-Next") !== "true") return records
  }
}
