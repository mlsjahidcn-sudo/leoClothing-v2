/**
 * DeepSeek Chat Completions client.
 *
 * Thin wrapper around `https://api.deepseek.com/chat/completions`.
 * Server-only — the API key must never reach the browser.
 *
 * DeepSeek's API is OpenAI-compatible, so we speak the OpenAI Chat
 * Completions schema. Anything that changes between OpenAI's spec and
 * DeepSeek's reality (e.g. `reasoning_content`) is handled here so
 * callers can stay provider-agnostic.
 *
 * Defaults:
 *   - model: `deepseek-chat` (DeepSeek-V3.x). Cheap, fast, good at
 *     structured product Q&A. Override via `DEEPSEEK_MODEL` env if
 *     you want `deepseek-reasoner` for harder questions.
 *   - max_tokens: 800. Hard ceiling to keep cost + latency bounded
 *     for short B2B questions; product descriptions fit easily.
 *   - temperature: 0.3. Low enough to be deterministic on product
 *     facts, high enough to not be robotic.
 */
import 'server-only';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekChatOptions {
  messages: DeepSeekMessage[];
  /** Override model for one call (defaults to env or `deepseek-chat`). */
  model?: string;
  /** Hard cap on assistant tokens. Defaults to 800. */
  maxTokens?: number;
  /** Sampling temperature. Defaults to 0.3. */
  temperature?: number;
  /** Abort after this many ms. Defaults to 25s — fits within Next.js
   *  route handler defaults without hitting the 30s Vercel hobby limit. */
  timeoutMs?: number;
}

export interface DeepSeekChatResult {
  content: string;
  /** Tokens consumed, if the API returned usage. */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** Echoes the model that actually served the request. */
  model: string;
}

interface DeepSeekApiResponse {
  id?: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class DeepSeekError extends Error {
  readonly status: number;
  readonly upstreamMessage?: string;
  constructor(message: string, status: number, upstreamMessage?: string) {
    super(message);
    this.name = 'DeepSeekError';
    this.status = status;
    this.upstreamMessage = upstreamMessage;
  }
}

function readConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new DeepSeekError(
      'DeepSeek API key is not configured. Set DEEPSEEK_API_KEY in the server environment.',
      500,
    );
  }
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  // Strip trailing slash to avoid double-slash on URL join.
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  return { apiKey, baseUrl: normalizedBase, model };
}

/**
 * Send a chat completion request to DeepSeek.
 *
 * Throws `DeepSeekError` on any non-2xx response, network failure,
 * timeout, or missing API key. Caller is expected to handle errors
 * at the route boundary and return a friendly message to the user.
 */
export async function deepseekChat(
  options: DeepSeekChatOptions,
): Promise<DeepSeekChatResult> {
  const { apiKey, baseUrl, model: defaultModel } = readConfig();
  const model = options.model || defaultModel;
  const maxTokens = options.maxTokens ?? 800;
  const temperature = options.temperature ?? 0.3;
  const timeoutMs = options.timeoutMs ?? 25_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: maxTokens,
        temperature,
        // DeepSeek streams by default if you set `stream: true`. We
        // don't — the chat UI shows a "thinking…" placeholder and
        // renders the full message once it lands. Latency stays under
        // ~3s for typical 200-token answers on the free tier.
        stream: false,
      }),
      signal: controller.signal,
      // Don't let Next.js cache — every chat turn is unique.
      cache: 'no-store',
    });
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') {
      throw new DeepSeekError(
        `DeepSeek request timed out after ${timeoutMs}ms`,
        504,
      );
    }
    throw new DeepSeekError(
      `DeepSeek network error: ${(err as Error).message}`,
      502,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let upstreamMessage: string | undefined;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      upstreamMessage = body?.error?.message;
    } catch {
      // Body wasn't JSON — leave undefined.
    }
    throw new DeepSeekError(
      `DeepSeek API returned ${res.status}${upstreamMessage ? `: ${upstreamMessage}` : ''}`,
      res.status >= 500 ? 502 : 400,
      upstreamMessage,
    );
  }

  const data = (await res.json()) as DeepSeekApiResponse;
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new DeepSeekError(
      'DeepSeek response missing assistant message content',
      502,
    );
  }
  return {
    content,
    usage: data.usage,
    model: data.model || model,
  };
}
