#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE_URL =
  process.env.TERMINAL_LITTLEBABY_API_BASE_URL?.trim() || "http://127.0.0.1:3000/api/ai";
const API_KEY = process.env.TERMINAL_LITTLEBABY_API_KEY?.trim();

if (!API_KEY) {
  throw new Error("TERMINAL_LITTLEBABY_API_KEY is required.");
}

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const timeString = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Expected HH:mm");
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const financeType = z.enum(["income", "expense"]);
const categoryKind = z.enum(["leaf", "group"]);
const categoryKindOrAll = z.enum(["leaf", "group", "all"]);
const accountType = z.enum(["asset", "debt"]);
const courseMode = z.enum(["auto", "current", "next", "today", "remaining"]);
const digestType = z.enum(["news", "github", "paper"]);
const monthInt = z.number().int().min(1).max(12);
const yearInt = z.number().int().min(2000).max(2100);
const digestHistoryItem = z.object({
  title: z.string().optional(),
  source: z.string().optional(),
  source_id: z.string().optional(),
  canonical_url: z.string().url().optional(),
  published_at: z.string().optional(),
  dedupe_key: z.string().optional(),
  doi: z.string().optional(),
  arxiv_id: z.string().optional(),
  openalex_id: z.string().optional(),
  repo_full_name: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
});

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

const COURSE_WEEKDAY_NAMES_EN = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const COURSE_WEEKDAY_NAMES_ZH = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function enrichCourseInfoPayload(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.courses)) {
    return payload;
  }

  return {
    ...payload,
    day_of_week_index_base: "monday=0",
    courses: payload.courses.map((course) => {
      const dayOfWeek = typeof course?.day_of_week === "number" ? course.day_of_week : undefined;
      if (
        dayOfWeek === undefined ||
        !Number.isInteger(dayOfWeek) ||
        dayOfWeek < 0 ||
        dayOfWeek >= COURSE_WEEKDAY_NAMES_EN.length
      ) {
        return course;
      }
      return {
        ...course,
        weekday_name: COURSE_WEEKDAY_NAMES_EN[dayOfWeek],
        weekday_label: COURSE_WEEKDAY_NAMES_ZH[dayOfWeek],
      };
    }),
  };
}

function normalizeDigestRecordPayload(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) {
    return payload;
  }

  return {
    success: payload.success === true,
    digest_type: payload.digest_type,
    message: payload.message || "简报历史已记录",
    note:
      "These items have now been written to digest history. Treat this as a write confirmation only. Do not use this response to judge whether the items were duplicates before sending; use terminal_littlebaby_check_digest_history for freshness decisions.",
    items_recorded: payload.items.length,
    items: payload.items.map((item) => ({
      index: item?.index,
      digest_type: item?.digest_type,
      dedupe_key: item?.dedupe_key,
      recorded: true,
      history_entry: item?.matched
        ? {
            id: item.matched.id,
            title: item.matched.title,
            source: item.matched.source,
            source_id: item.matched.source_id,
            canonical_url: item.matched.canonical_url,
            published_at: item.matched.published_at,
            first_sent_at: item.matched.first_sent_at,
            last_sent_at: item.matched.last_sent_at,
            sent_count: item.matched.sent_count,
          }
        : null,
    })),
  };
}

function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function callApi(path, options = {}) {
  const url = `${API_BASE_URL}${path}${buildQuery(options.query ?? {})}`;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: compactObject({
      "Content-Type": options.body ? "application/json" : undefined,
      "X-API-Key": API_KEY,
    }),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let payload;
  const text = await response.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: false,
              status: response.status,
              error: message,
              data: payload,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: "terminal-claw-api",
  version: "1.0.0",
});

server.tool(
  "terminal_littlebaby_context",
  "Read finance context including categories, accounts, and today's date from terminal-claw.",
  async () => callApi("/context"),
);

server.tool(
  "terminal_littlebaby_recent_transactions",
  "Read recent transactions from terminal-claw for a recent time window.",
  {
    limit: z.number().int().min(1).max(100).optional(),
    days: z.number().int().min(1).max(3650).optional(),
  },
  async ({ limit, days }) =>
    callApi("/recent", {
      query: { limit, days },
    }),
);

server.tool(
  "terminal_littlebaby_balance",
  "Read all account balances and net worth summary from terminal-claw.",
  async () => callApi("/balance"),
);

server.tool(
  "terminal_littlebaby_course_info",
  "Read course information for a date/time from terminal-claw. day_of_week uses monday=0, and each returned course also includes weekday_name plus weekday_label for clarity. Use current for the class happening right now, next for the next upcoming class block, today for all classes today, and remaining for the classes still left today including the current class if one is in progress. For requests like '我现在还有课吗' or '今天后面还有课吗', prefer remaining. owner defaults to 'me' (his schedule); use 'partner' for her schedule.",
  {
    date: dateString.optional(),
    time: timeString.optional(),
    mode: courseMode.optional(),
    owner: z.enum(["me", "partner"]).optional(),
  },
  async ({ date, time, mode, owner }) => {
    const result = await callApi("/course-info", {
      query: { date, time, mode, owner },
    });
    if (result.isError || !Array.isArray(result.content) || result.content[0]?.type !== "text") {
      return result;
    }

    try {
      const payload = JSON.parse(result.content[0].text);
      result.content[0].text = JSON.stringify(enrichCourseInfoPayload(payload), null, 2);
    } catch {
      // Keep the original payload when the upstream response is not JSON.
    }

    return result;
  },
);

server.tool(
  "terminal_littlebaby_create_transaction",
  "Create a new transaction in terminal-claw and update the linked account balance.",
  {
    amount: z.number().positive(),
    category_id: positiveInt,
    account_id: positiveInt,
    description: z.string().optional(),
    date: dateString.optional(),
    type: financeType.optional(),
  },
  async (args) =>
    callApi("/transaction", {
      method: "POST",
      body: compactObject(args),
    }),
);

server.tool(
  "terminal_littlebaby_transactions",
  "List transactions from terminal-claw with optional filters and summary totals.",
  {
    start_date: dateString.optional(),
    end_date: dateString.optional(),
    category_id: positiveInt.optional(),
    account_id: positiveInt.optional(),
    type: financeType.optional(),
    limit: z.number().int().min(1).max(1000).optional(),
    offset: nonNegativeInt.optional(),
  },
  async (args) =>
    callApi("/transactions", {
      query: compactObject(args),
    }),
);

server.tool(
  "terminal_littlebaby_update_transaction",
  "Update an existing transaction in terminal-claw and reconcile account balances.",
  {
    id: positiveInt,
    amount: z.number().positive().optional(),
    category_id: positiveInt.optional(),
    account_id: positiveInt.optional(),
    description: z.string().optional(),
    date: dateString.optional(),
  },
  async ({ id, ...body }) =>
    callApi(`/transaction/${id}`, {
      method: "PUT",
      body: compactObject(body),
    }),
);

server.tool(
  "terminal_littlebaby_delete_transaction",
  "Delete a transaction from terminal-claw and restore the affected account balance.",
  {
    id: positiveInt,
  },
  async ({ id }) =>
    callApi(`/transaction/${id}`, {
      method: "DELETE",
    }),
);

server.tool(
  "terminal_littlebaby_sync_balance",
  "Set balances for one or more accounts directly in terminal-claw without creating transactions.",
  {
    accounts: z
      .array(
        z.object({
          id: positiveInt,
          balance: z.number(),
          limit_amount: z.number().optional(),
        }),
      )
      .min(1),
  },
  async ({ accounts }) =>
    callApi("/sync-balance", {
      method: "POST",
      body: { accounts },
    }),
);

server.tool(
  "terminal_littlebaby_create_account",
  "Create a new account in terminal-claw.",
  {
    name: z.string().min(1),
    type: accountType.optional(),
    balance: z.number().optional(),
    limit_amount: z.number().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  },
  async (args) =>
    callApi("/account", {
      method: "POST",
      body: compactObject(args),
    }),
);

server.tool(
  "terminal_littlebaby_update_account",
  "Update an existing account in terminal-claw.",
  {
    id: positiveInt,
    name: z.string().min(1).optional(),
    type: accountType.optional(),
    balance: z.number().optional(),
    limit_amount: z.number().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  },
  async ({ id, ...body }) =>
    callApi(`/account/${id}`, {
      method: "PUT",
      body: compactObject(body),
    }),
);

server.tool(
  "terminal_littlebaby_delete_account",
  "Delete an account from terminal-claw.",
  {
    id: positiveInt,
  },
  async ({ id }) =>
    callApi(`/account/${id}`, {
      method: "DELETE",
    }),
);

server.tool(
  "terminal_littlebaby_categories",
  "List categories from terminal-claw. Supports ordinary categories and group categories.",
  {
    type: financeType.optional(),
    kind: categoryKindOrAll.optional(),
    include_members: z.boolean().optional(),
  },
  async ({ type, kind, include_members }) =>
    callApi("/categories", {
      query: { type, kind, include_members },
    }),
);

server.tool(
  "terminal_littlebaby_create_category",
  "Create a new category in terminal-claw. Use kind=group with member_ids to create a grouped category.",
  {
    name: z.string().min(1),
    type: financeType,
    icon: z.string().optional(),
    kind: categoryKind.optional(),
    member_ids: z.array(positiveInt).min(1).optional(),
  },
  async (args) =>
    callApi("/category", {
      method: "POST",
      body: compactObject(args),
    }),
);

server.tool(
  "terminal_littlebaby_update_category",
  "Update an existing category in terminal-claw. Group categories may update member_ids.",
  {
    id: positiveInt,
    name: z.string().min(1).optional(),
    type: financeType.optional(),
    icon: z.string().optional(),
    member_ids: z.array(positiveInt).min(1).optional(),
  },
  async ({ id, ...body }) =>
    callApi(`/category/${id}`, {
      method: "PUT",
      body: compactObject(body),
    }),
);

server.tool(
  "terminal_littlebaby_delete_category",
  "Delete a category from terminal-claw.",
  {
    id: positiveInt,
  },
  async ({ id }) =>
    callApi(`/category/${id}`, {
      method: "DELETE",
    }),
);

server.tool(
  "terminal_littlebaby_budgets",
  "List monthly budgets from terminal-claw for a given year and month. Defaults to the current month when omitted.",
  {
    year: yearInt.optional(),
    month: monthInt.optional(),
  },
  async ({ year, month }) =>
    callApi("/budgets", {
      query: { year, month },
    }),
);

server.tool(
  "terminal_littlebaby_create_budget",
  "Create a new monthly budget in terminal-claw.",
  {
    category_id: positiveInt,
    year: yearInt,
    month: monthInt,
    budget_amount: z.number().positive(),
    alert_threshold: z.number().min(0).max(100).optional(),
    note: z.string().optional(),
    sort_order: z.number().int().optional(),
  },
  async (args) =>
    callApi("/budget", {
      method: "POST",
      body: compactObject(args),
    }),
);

server.tool(
  "terminal_littlebaby_update_budget",
  "Update an existing monthly budget in terminal-claw.",
  {
    id: positiveInt,
    category_id: positiveInt.optional(),
    year: yearInt.optional(),
    month: monthInt.optional(),
    budget_amount: z.number().positive().optional(),
    alert_threshold: z.number().min(0).max(100).optional(),
    note: z.string().nullable().optional(),
    sort_order: z.number().int().optional(),
  },
  async ({ id, ...body }) =>
    callApi(`/budget/${id}`, {
      method: "PUT",
      body: compactObject(body),
    }),
);

server.tool(
  "terminal_littlebaby_delete_budget",
  "Delete a monthly budget from terminal-claw.",
  {
    id: positiveInt,
  },
  async ({ id }) =>
    callApi(`/budget/${id}`, {
      method: "DELETE",
    }),
);

server.tool(
  "terminal_littlebaby_goals",
  "List all goals from terminal-claw.",
  async () => callApi("/goals"),
);

server.tool(
  "terminal_littlebaby_reorder_goals",
  "Reorder all goals in terminal-claw. goal_ids must include every goal exactly once in the desired order.",
  {
    goal_ids: z.array(positiveInt).min(1),
  },
  async ({ goal_ids }) =>
    callApi("/goal/reorder", {
      method: "PUT",
      body: { goal_ids },
    }),
);

server.tool(
  "terminal_littlebaby_create_goal",
  "Create a new goal in terminal-claw.",
  {
    name: z.string().min(1),
    icon: z.string().optional(),
    color: z.string().optional(),
    target_amount: z.number().positive(),
    deadline: dateString.optional(),
    sort_order: z.number().int().optional(),
  },
  async (args) =>
    callApi("/goal", {
      method: "POST",
      body: compactObject(args),
    }),
);

server.tool(
  "terminal_littlebaby_update_goal",
  "Update an existing goal in terminal-claw.",
  {
    id: positiveInt,
    name: z.string().min(1).optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    target_amount: z.number().positive().optional(),
    deadline: dateString.nullable().optional(),
    sort_order: z.number().int().optional(),
  },
  async ({ id, ...body }) =>
    callApi(`/goal/${id}`, {
      method: "PUT",
      body: compactObject(body),
    }),
);

server.tool(
  "terminal_littlebaby_delete_goal",
  "Delete a goal from terminal-claw.",
  {
    id: positiveInt,
  },
  async ({ id }) =>
    callApi(`/goal/${id}`, {
      method: "DELETE",
    }),
);

server.tool(
  "terminal_littlebaby_check_digest_history",
  "Check whether digest items have appeared recently in terminal-claw. Use this before sending news, GitHub, or paper briefs to avoid repeats.",
  {
    digest_type: digestType,
    items: z.array(digestHistoryItem).min(1),
    window_days: z.number().int().min(1).max(3650).optional(),
  },
  async ({ digest_type, items, window_days }) =>
    callApi("/digest-history/check", {
      method: "POST",
      body: compactObject({
        digest_type,
        items,
        window_days,
      }),
    }),
);

server.tool(
  "terminal_littlebaby_record_digest_history",
  "Record digest items that have just been sent in terminal-claw so future briefs can deduplicate them. This is a write-confirmation tool, not a freshness-check tool. After a successful write, the stored history will naturally show the items as already seen; do not use this response to decide whether they were duplicates before sending.",
  {
    digest_type: digestType,
    items: z.array(digestHistoryItem).min(1),
    sent_at: z.string().optional(),
  },
  async ({ digest_type, items, sent_at }) => {
    const result = await callApi("/digest-history/record", {
      method: "POST",
      body: compactObject({
        digest_type,
        items,
        sent_at,
      }),
    });

    if (result.isError || !Array.isArray(result.content) || result.content[0]?.type !== "text") {
      return result;
    }

    try {
      const payload = JSON.parse(result.content[0].text);
      result.content[0].text = JSON.stringify(normalizeDigestRecordPayload(payload), null, 2);
    } catch {
      // Keep the original payload when the upstream response is not JSON.
    }

    return result;
  },
);

await server.connect(new StdioServerTransport());
