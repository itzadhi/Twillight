const state = {
  providers: [],
  config: {},
  cwd: "",
  soundThemes: [],
  audio: null,
}

const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => Array.from(document.querySelectorAll(selector))

async function loadStatus() {
  const response = await fetch("/api/status")
  const data = await response.json()
  if (!data.ok) throw new Error(data.message || "Unable to load status")
  state.providers = data.providers
  state.config = data.config
  state.cwd = data.cwd
  state.soundThemes = data.soundThemes || ["crystal", "terminal", "soft", "mute"]
  renderProviderSelect()
  renderSoundThemes()
  fillForm(data.config)
  renderStatus(data)
  renderProviderDetail()
}

function renderStatus(data) {
  $("#strip-provider").textContent = data.config.providerTitle
  $("#strip-model").textContent = data.config.model
  $("#strip-cwd").textContent = data.cwd
  document.body.dataset.density = data.config.dashboardDensity
}

function renderProviderSelect() {
  $("#provider-select").innerHTML = state.providers.map((provider) => {
    const selected = provider.name === state.config.provider ? "selected" : ""
    return `<option value="${provider.name}" ${selected}>${escapeHtml(provider.title)}</option>`
  }).join("")
}

function renderSoundThemes() {
  $("#sound-theme").innerHTML = state.soundThemes.map((theme) => `<option value="${escapeHtml(theme)}">${escapeHtml(theme)}</option>`).join("")
}

function fillForm(config) {
  $("#provider-select").value = config.provider
  $("#model-input").value = config.model
  $("#gateway-input").value = config.cloudflareGatewayUrl
  $("#fallback-input").value = config.fallbackModels
  $("#uncensored-input").value = config.uncensoredModel
  $("#tools-input").value = config.enabledTools
  $("#allowlist-input").value = config.commandAllowlist
  $("#density-select").value = config.dashboardDensity
  $("#pet-select").value = config.pet
  $("#sound-theme").value = config.soundTheme
  $("#sound-volume").value = config.soundVolume
  $("#max-tokens").value = config.maxTokens
  $("#timeout-ms").value = config.requestTimeoutMs
  $("#queue-delay").value = config.queueDelayMs
  $("#temperature").value = config.temperature
  setRadio("agentMode", config.agentMode)
  setRadio("permissionMode", config.permissionMode)
  setCheck("updateCheck", config.updateCheck)
  setCheck("autoUpdate", config.autoUpdate)
  setCheck("streaming", config.streaming)
  setCheck("actions", config.actions)
  setCheck("status", config.status)
  setCheck("compact", config.compact)
  setCheck("webSound", config.webSound)
}

function renderProviderDetail() {
  const provider = selectedProvider()
  if (!provider) return
  $("#provider-detail").innerHTML = `
    <div class="provider-box">
      <strong>${escapeHtml(provider.title)}</strong>
      <p>${provider.freeFriendly ? '<span class="ok">free-friendly</span>' : '<span class="warn">paid/provider billing</span>'} · ${provider.noAuth ? "no key required" : `key env <code>${escapeHtml(provider.keyEnv)}</code>`}</p>
      <p>${escapeHtml(provider.note || "")}</p>
      <div>${provider.fallbackModels.map((model) => `<button class="model-chip" type="button" data-model="${escapeHtml(model)}">${escapeHtml(model)}</button>`).join("")}</div>
    </div>
  `
}

function selectedProvider() {
  return state.providers.find((item) => item.name === $("#provider-select").value) || state.providers[0]
}

function setRadio(name, value) {
  const input = document.querySelector(`[name='${name}'][value='${value}']`)
  if (input) input.checked = true
}

function setCheck(name, value) {
  const input = document.querySelector(`[name='${name}']`)
  if (input) input.checked = Boolean(value)
}

function formPayload(form) {
  const data = new FormData(form)
  return {
    provider: data.get("provider"),
    model: data.get("model"),
    fallbackModels: data.get("fallbackModels"),
    uncensoredModel: data.get("uncensoredModel"),
    cloudflareGatewayUrl: data.get("cloudflareGatewayUrl"),
    enabledTools: data.get("enabledTools"),
    commandAllowlist: data.get("commandAllowlist"),
    agentMode: data.get("agentMode"),
    permissionMode: data.get("permissionMode"),
    streaming: Boolean(data.get("streaming")),
    actions: Boolean(data.get("actions")),
    status: Boolean(data.get("status")),
    compact: Boolean(data.get("compact")),
    updateCheck: Boolean(data.get("updateCheck")),
    autoUpdate: Boolean(data.get("autoUpdate")),
    pet: data.get("pet"),
    webSound: Boolean(data.get("webSound")),
    soundTheme: data.get("soundTheme"),
    soundVolume: Number(data.get("soundVolume")),
    dashboardDensity: data.get("dashboardDensity"),
    maxTokens: Number(data.get("maxTokens")),
    requestTimeoutMs: Number(data.get("requestTimeoutMs")),
    queueDelayMs: Number(data.get("queueDelayMs")),
    temperature: Number(data.get("temperature")),
  }
}

async function saveConfig(event) {
  event.preventDefault()
  const saveState = $("#save-state")
  saveState.textContent = "Saving all config..."
  play("tick")
  const response = await fetch("/api/config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(formPayload(event.currentTarget)),
  })
  const data = await response.json()
  if (!data.ok) {
    saveState.innerHTML = `<span class="danger">${escapeHtml(data.message || data.error || "Save failed")}</span>`
    play("error")
    return
  }
  state.config = data.config
  fillForm(data.config)
  renderStatus({ config: data.config, cwd: state.cwd })
  renderProviderDetail()
  saveState.innerHTML = `<span class="ok">Saved</span> ${escapeHtml(data.saved)}`
  play("save")
}

function play(kind) {
  const enabled = document.querySelector("[name='webSound']")?.checked
  const theme = $("#sound-theme")?.value || "crystal"
  if (!enabled || theme === "mute") return
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  state.audio ||= new AudioContext()
  const ctx = state.audio
  const volume = Math.max(0, Math.min(100, Number($("#sound-volume")?.value || 35))) / 100
  const gain = ctx.createGain()
  const osc = ctx.createOscillator()
  const now = ctx.currentTime
  const base = theme === "terminal" ? 220 : theme === "soft" ? 330 : 520
  const table = {
    tick: [base, 0.045],
    save: [base * 1.5, 0.08],
    error: [140, 0.12],
    switch: [base * 1.2, 0.06],
  }
  const [freq, duration] = table[kind] || table.tick
  osc.frequency.setValueAtTime(freq, now)
  osc.type = theme === "terminal" ? "square" : "sine"
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.08), now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char])
}

$("#config-form").addEventListener("submit", saveConfig)
$("#provider-select").addEventListener("change", () => {
  const provider = selectedProvider()
  if (provider) {
    $("#model-input").value = provider.defaultModel
    $("#fallback-input").value = provider.fallbackModels.join(",")
  }
  renderProviderDetail()
  play("switch")
})
$("#use-default").addEventListener("click", () => {
  const provider = selectedProvider()
  if (provider) $("#model-input").value = provider.defaultModel
  play("tick")
})
$("#tools-all").addEventListener("click", () => {
  $("#tools-input").value = "all"
  play("tick")
})
$("#test-sound").addEventListener("click", () => play("save"))
$("#density-select").addEventListener("change", (event) => {
  document.body.dataset.density = event.target.value
  play("switch")
})
$("#provider-detail").addEventListener("click", (event) => {
  const button = event.target.closest("[data-model]")
  if (button) {
    $("#model-input").value = button.dataset.model
    play("tick")
  }
})
$$("[data-preset-provider]").forEach((button) => button.addEventListener("click", () => {
  $("#provider-select").value = button.dataset.presetProvider
  $("#provider-select").dispatchEvent(new Event("change"))
}))
$$("[data-preset-perm]").forEach((button) => button.addEventListener("click", () => {
  setRadio("permissionMode", button.dataset.presetPerm)
  play("tick")
}))
$$("[data-preset-tools]").forEach((button) => button.addEventListener("click", () => {
  $("#tools-input").value = button.dataset.presetTools
  play("tick")
}))
$$("[data-jump]").forEach((button) => button.addEventListener("click", () => {
  $$(".rail-button").forEach((item) => item.classList.toggle("active", item === button))
  document.getElementById(button.dataset.jump)?.scrollIntoView({ block: "start", behavior: "smooth" })
  play("tick")
}))

loadStatus().catch((error) => {
  document.body.innerHTML = `<main class="app-shell"><section class="card"><h1>Twillight Web failed</h1><p>${escapeHtml(error.message)}</p></section></main>`
})
