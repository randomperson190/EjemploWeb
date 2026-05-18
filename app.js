const clientId = "54886740879-bhbtkpd85av0mq44hc3qbqd87neaffc0.apps.googleusercontent.com";

// ⚠️ tiene que coincidir EXACTO con Google Cloud
const redirectUri = window.location.origin + window.location.pathname;

const scope = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/drive.appdata"
].join(" ");

let accessToken = null;

// ==========================
// PKCE helpers
// ==========================
function generarRandomString(length) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const values = crypto.getRandomValues(new Uint8Array(length));
  values.forEach(v => result += charset[v % charset.length]);
  return result;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest("SHA-256", data);
}

function base64urlencode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ==========================
// LOGIN
// ==========================
async function login() {
  const codeVerifier = generarRandomString(64);
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
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  window.location = url.toString();
}

// ==========================
// TOKEN
// ==========================
async function intercambiarCodigoPorToken(code) {
  const codeVerifier = localStorage.getItem("code_verifier");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });

  const data = await res.json();
  accessToken = data.access_token;

  document.getElementById("loginBtn").style.display = "none";
  document.getElementById("app").style.display = "block";

  cargarEstado();
}

// ==========================
// GUARDAR
// ==========================
async function guardarEstado(estado) {
  const data = {
    estado,
    timestamp: new Date().toISOString()
  };

  const fileName = "asistencia.json";

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and spaces='appDataFolder'&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const searchData = await searchRes.json();
  let fileId = searchData.files?.[0]?.id;

  if (!fileId) {
    const metadata = {
      name: fileName,
      parents: ["appDataFolder"]
    };

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", new Blob([JSON.stringify(data)], { type: "application/json" }));

    const createRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: form
      }
    );

    const result = await createRes.json();
    fileId = result.id;
  } else {
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      }
    );
  }

  document.getElementById("estadoActual").innerText =
    "Estado guardado: " + estado;
}

// ==========================
// LEER
// ==========================
async function cargarEstado() {
  const fileName = "asistencia.json";

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and spaces='appDataFolder'&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const data = await res.json();

  if (!data.files || data.files.length === 0) {
    document.getElementById("estadoActual").innerText = "Sin datos todavía";
    return;
  }

  const fileId = data.files[0].id;

  const fileRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const contenido = await fileRes.json();

  document.getElementById("estadoActual").innerText =
    "Estado actual: " + contenido.estado;
}

// ==========================
// INIT
// ==========================
document.getElementById("loginBtn").onclick = login;

const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (code) {
  window.history.replaceState({}, document.title, redirectUri);
  intercambiarCodigoPorToken(code);
}