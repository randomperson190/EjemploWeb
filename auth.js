const clientId = "54886740879-bhbtkpd85av0mq44hc3qbqd87neaffc0.apps.googleusercontent.com";
const redirectUri = window.location.origin + window.location.pathname;
const scope = "openid profile email https://www.googleapis.com/auth/drive.appdata";

function base64urlencode(a) {
  return btoa(String.fromCharCode(...new Uint8Array(a)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

function randomString(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64urlencode(array);
}

// LOGIN
async function login(prompt = "consent") {
  const codeVerifier = randomString(64);
  localStorage.setItem("code_verifier", codeVerifier);

  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64urlencode(hashed);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", prompt);

  window.location = url.toString();
}

// TOKEN
async function handleRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (!code) return null;

  const codeVerifier = localStorage.getItem("code_verifier");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });

  const data = await tokenRes.json();

  // limpiar URL
  window.history.replaceState({}, document.title, redirectUri);

  return data;
}

// REFRESH SILENCIOSO
async function silentRefresh() {
  await login("none");
}

document.getElementById("loginBtn").onclick = () => login();
