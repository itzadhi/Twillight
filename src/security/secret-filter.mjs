export function redactSecrets(text) {
  return String(text)
    .replace(/sk-or-v1-[A-Za-z0-9_-]+/g, "sk-or-v1-REDACTED")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "sk-REDACTED")
    .replace(/((?:TWILLIGHT_CLOUDFLARE_GATEWAY_KEY|TWILLIGHT_WORKER_TOKEN|CLOUDFLARE_WORKER_TOKEN)\s*=\s*)[^\s]+/gi, "$1REDACTED")
    .replace(/(api[_-]?key\s*=\s*)[^\s]+/gi, "$1REDACTED")
}
