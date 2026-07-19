const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

function isAdmin(request, env) {
  const expected = String(env.ADMIN_PASSWORD || "");
  const authorization = request.headers.get("Authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || supplied.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  }
  return difference === 0;
}

function parseRow(row) {
  try {
    const patterns = JSON.parse(row.patterns);
    const responses = JSON.parse(row.responses);
    if (!Array.isArray(patterns) || !Array.isArray(responses)) return null;
    return { id: row.id, patterns, responses, createdAt: row.created_at };
  } catch {
    return null;
  }
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ entries: [], configured: false });
  try {
    const result = await env.DB.prepare(
      "SELECT id, patterns, responses, created_at FROM knowledge ORDER BY id ASC LIMIT 2000",
    ).all();
    return json({ entries: (result.results || []).map(parseRow).filter(Boolean), configured: true });
  } catch {
    return json({ entries: [], configured: false, error: "Database table is not ready." });
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Cloudflare D1 មិនទាន់បានភ្ជាប់។" }, 503);
  if (!isAdmin(request, env)) return json({ error: "លេខសម្ងាត់ Admin មិនត្រឹមត្រូវ។" }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "ទិន្នន័យមិនត្រឹមត្រូវ។" }, 400);
  }

  const patterns = Array.isArray(body.patterns)
    ? [...new Set(body.patterns.map((value) => String(value).trim()).filter(Boolean))]
    : [];
  const responses = Array.isArray(body.responses)
    ? [...new Set(body.responses.map((value) => String(value).trim()).filter(Boolean))]
    : [];
  if (!patterns.length || patterns.length > 30 || patterns.some((value) => value.length < 2 || value.length > 500)) {
    return json({ error: "សូមដាក់សំណួរ 1–30 និងមួយៗមិនលើស 500 តួអក្សរ។" }, 400);
  }
  if (!responses.length || responses.length > 5 || responses.some((value) => value.length < 2 || value.length > 2000)) {
    return json({ error: "សូមដាក់ចម្លើយត្រឹមត្រូវ និងមិនលើស 2,000 តួអក្សរ។" }, 400);
  }

  const result = await env.DB.prepare(
    "INSERT INTO knowledge (patterns, responses) VALUES (?, ?)",
  )
    .bind(JSON.stringify(patterns), JSON.stringify(responses))
    .run();
  return json(
    {
      entry: {
        id: result.meta.last_row_id,
        patterns,
        responses,
        createdAt: new Date().toISOString(),
      },
    },
    201,
  );
}

