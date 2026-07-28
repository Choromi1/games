type NoticePayload = {
  id: string;
  game_key: string;
  game_name: string;
  category: string;
  title: string;
  summary: string | null;
  content: string;
  cover_image_url: string | null;
  published_at: string;
  author_name: string | null;
};

const categoryMap: Record<string, { label: string; color: number }> = {
  notice: { label: "공지", color: 0xc5c965 },
  important: { label: "중요", color: 0xc26850 },
  update: { label: "업데이트", color: 0x78a5a0 },
  maintenance: { label: "점검", color: 0xd09b54 },
  event: { label: "이벤트", color: 0x9c7cc0 },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function truncate(value: unknown, maximum: number): string {
  const text = String(value ?? "").trim();
  if (text.length <= maximum) return text;
  return `${text.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}

function markdownToPlainText(value: unknown): string {
  return String(value ?? "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[>*+-]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function readServiceKey(): string {
  const currentKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (currentKeys) {
    try {
      const parsed = JSON.parse(currentKeys) as Record<string, string>;
      const key = parsed.default || Object.values(parsed)[0];
      if (key) return key;
    } catch {
      // Fall back to the legacy key while existing projects migrate.
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function readDiscordWebhook(): string {
  const candidates = [
    "DISCORD_WEBHOOK_URL",
    "DISCORD_NOTICE_WEBHOOK_URL",
    "NOTICE_DISCORD_WEBHOOK_URL",
    "DISCORD_WEBHOOK",
  ];

  for (const name of candidates) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }

  return "";
}

function serviceHeaders(serviceKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: serviceKey,
    "Content-Type": "application/json",
  };

  if (serviceKey.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }

  return headers;
}

async function callRpc<T>(
  name: string,
  body: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string,
): Promise<T> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceHeaders(serviceKey),
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Supabase RPC ${name} failed (${response.status}): ${
        truncate(responseText, 500)
      }`,
    );
  }

  return (responseText ? JSON.parse(responseText) : null) as T;
}

function validateDiscordWebhook(rawUrl: string): URL {
  const webhook = new URL(rawUrl);
  const isDiscordHost = webhook.hostname === "discord.com" ||
    webhook.hostname.endsWith(".discord.com") ||
    webhook.hostname === "discordapp.com" ||
    webhook.hostname.endsWith(".discordapp.com");

  if (
    webhook.protocol !== "https:" ||
    !isDiscordHost ||
    !webhook.pathname.includes("/api/webhooks/")
  ) {
    throw new Error("Configured Discord webhook URL is invalid.");
  }

  webhook.searchParams.set("wait", "true");
  return webhook;
}

function buildDiscordPayload(notice: NoticePayload): Record<string, unknown> {
  const category = categoryMap[notice.category] || categoryMap.notice;
  const siteBase = (Deno.env.get("NOTICE_SITE_URL") ||
    "https://choromi1.github.io/games").replace(/\/+$/, "");
  const noticeUrl = new URL(`${siteBase}/notices/`);
  noticeUrl.searchParams.set("game", notice.game_key);
  noticeUrl.searchParams.set("id", notice.id);

  const summary = truncate(
    notice.summary || markdownToPlainText(notice.content) ||
      "새 공지가 등록되었습니다.",
    1000,
  );

  const embed: Record<string, unknown> = {
    title: truncate(notice.title, 256),
    url: noticeUrl.toString(),
    description: summary,
    color: category.color,
    fields: [
      {
        name: "게임",
        value: truncate(notice.game_name || notice.game_key, 1024),
        inline: true,
      },
      {
        name: "분류",
        value: category.label,
        inline: true,
      },
      {
        name: "작성자",
        value: truncate(notice.author_name || "Choromi", 1024),
        inline: true,
      },
    ],
    footer: {
      text: "Choromi Game Servers",
    },
    timestamp: new Date(notice.published_at).toISOString(),
  };

  if (
    notice.cover_image_url &&
    /^https:\/\//i.test(notice.cover_image_url)
  ) {
    embed.image = { url: notice.cover_image_url };
  }

  return {
    username: "Choromi 공지",
    content: `📢 **${
      truncate(notice.game_name || notice.game_key, 80)
    } 새 공지**`,
    embeds: [embed],
    allowed_mentions: { parse: [] },
  };
}

function safeError(error: unknown, webhookUrl = ""): string {
  let message = error instanceof Error ? error.message : String(error);
  if (webhookUrl) message = message.replaceAll(webhookUrl, "[redacted]");
  message = message.replace(
    /https:\/\/(?:[^/\s]+\.)?discord(?:app)?\.com\/api\/webhooks\/[^\s"']+/gi,
    "[redacted-discord-webhook]",
  );
  return truncate(message, 1000);
}

async function sendDiscord(
  webhookUrl: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const webhook = validateDiscordWebhook(webhookUrl);
  let lastError = "Discord webhook request failed.";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) return;

      const responseText = await response.text();
      lastError = `Discord returned ${response.status}: ${
        truncate(responseText, 300)
      }`;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === 3) break;
    } catch (error) {
      lastError = safeError(error, webhookUrl);
      if (attempt === 3) break;
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }

  throw new Error(lastError);
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const dispatchToken = request.headers
    .get("x-notice-dispatch-token")
    ?.trim();
  if (!dispatchToken) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  let requestBody: { notice_id?: unknown };
  try {
    requestBody = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const noticeId = String(requestBody.notice_id || "");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(noticeId)
  ) {
    return jsonResponse({ error: "Invalid notice ID." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "") || "";
  const serviceKey = readServiceKey();
  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase server credentials are unavailable.");
    return jsonResponse({ error: "Server configuration is unavailable." }, 500);
  }

  let claimedNotice: NoticePayload | null = null;
  try {
    claimedNotice = await callRpc<NoticePayload | null>(
      "claim_notice_discord_delivery",
      {
        p_notice_id: noticeId,
        p_dispatch_token: dispatchToken,
      },
      supabaseUrl,
      serviceKey,
    );
  } catch (error) {
    console.error(safeError(error));
    return jsonResponse({ error: "Unauthorized or unavailable." }, 401);
  }

  if (!claimedNotice) {
    return jsonResponse({ ok: true, skipped: true });
  }

  const webhookUrl = readDiscordWebhook();
  let succeeded = false;
  let deliveryError = "";

  try {
    if (!webhookUrl) {
      throw new Error(
        "Discord webhook secret is missing. Expected DISCORD_WEBHOOK_URL.",
      );
    }
    await sendDiscord(webhookUrl, buildDiscordPayload(claimedNotice));
    succeeded = true;
  } catch (error) {
    deliveryError = safeError(error, webhookUrl);
    console.error(`Discord notice delivery failed: ${deliveryError}`);
  }

  try {
    await callRpc<boolean>(
      "finish_notice_discord_delivery",
      {
        p_notice_id: noticeId,
        p_dispatch_token: dispatchToken,
        p_succeeded: succeeded,
        p_error: succeeded ? null : deliveryError,
      },
      supabaseUrl,
      serviceKey,
    );
  } catch (error) {
    console.error(
      `Could not record Discord delivery result: ${safeError(error)}`,
    );
    return jsonResponse({ error: "Could not record delivery result." }, 500);
  }

  if (!succeeded) {
    return jsonResponse({ error: "Discord delivery failed." }, 502);
  }

  return jsonResponse({ ok: true, notice_id: noticeId });
});
