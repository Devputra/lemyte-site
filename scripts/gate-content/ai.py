"""Free AI backends (OpenAI-compatible chat APIs) with image input, keys from .env.local.

    python3 ai.py --test            # ping every provider that has a key
    from ai import chat, PROVIDERS; chat("mistral", prompt, [png paths])

Free-tier notes (check the sites; limits change):
  github     GitHub Models, GPT-4.1 — ~50 req/day, ~8k input / 4k output tokens per request -> small chunks (2-4 questions)
  mistral    Mistral Medium (vision) — ~1 req/s, generous monthly cap
  openrouter ':free' models — ~50 req/day (1000 with $10 credit); model availability varies
  groq       Qwen3.8-27B — fast, max 5 images per request
  zhipu      glm-4.1v-thinking-flash — free, weaker
"""
import base64
import json
import sys
import time
import urllib.error
import urllib.request

from common import ENV

PROVIDERS = {  # name: (url, key var, default model, max images, image style)
    "github": ("https://models.github.ai/inference/chat/completions", "GITHUB_MODELS_TOKEN", "openai/gpt-4.1", 10, "openai"),
    "mistral": ("https://api.mistral.ai/v1/chat/completions", "MISTRAL_API_KEY", "mistral-medium-latest", 8, "string"),
    "openrouter": ("https://openrouter.ai/api/v1/chat/completions", "OPENROUTER_API_KEY",
                   "qwen/qwen3.8-27b:free", 8, "openai"),
    "groq": ("https://api.groq.com/openai/v1/chat/completions", "GROQ_API_KEY",
             "qwen/qwen3.8-27b", 3, "openai"),
    "zhipu": ("https://open.bigmodel.cn/api/paas/v4/chat/completions", "ZHIPUAI_API_KEY",
              "glm-4.1v-thinking-flash", 5, "raw"),
}


def available():
    return [p for p, v in PROVIDERS.items() if ENV.get(v[1])]


def chat(provider, prompt, images=(), model=None, max_tokens=8000, tries=4):
    url, keyvar, dmodel, maxim, style = PROVIDERS[provider]
    key = ENV.get(keyvar)
    if not key:
        raise SystemExit(f"{provider}: {keyvar} is empty in .env.local")
    max_tokens = min(max_tokens, {"github": 4000, "groq": 8000}.get(provider, max_tokens))  # free-tier output caps
    images = list(images)
    if len(images) > maxim:
        raise SystemExit(f"{provider}: {len(images)} images > limit {maxim}; use a smaller question range")
    content = [{"type": "text", "text": prompt}]
    for p in images:
        b = base64.b64encode(open(p, "rb").read()).decode()
        data = f"data:image/png;base64,{b}"
        iu = data if style == "string" else ({"url": b} if style == "raw" else {"url": data})
        content.append({"type": "image_url", "image_url": iu})
    body = {"model": model or dmodel, "messages": [{"role": "user", "content": content}],
            "max_tokens": max_tokens, "temperature": 0.2}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                                          "Accept": "application/json",
                                          "User-Agent": "lemyte-gate-content/1.0"})  # Groq/Cloudflare blocks Python-urllib
    for i in range(tries):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=900))
            return r["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code in (429, 500, 502, 503) and i < tries - 1:
                print(f"  {provider}: HTTP {e.code}, retry {i + 1}", file=sys.stderr, flush=True)
                time.sleep(30 * (i + 1))
                continue
            raise SystemExit(f"{provider} HTTP {e.code}: {msg}")


if __name__ == "__main__" and "--test" in sys.argv:
    have = available()
    print("keys set:", have or "none", "| missing:", [p for p in PROVIDERS if p not in have])
    for p in have:
        try:
            print(p, "->", chat(p, "Reply with exactly: OK", max_tokens=20).strip()[:40])
        except SystemExit as e:
            print(p, "FAILED:", e)
