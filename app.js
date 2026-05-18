let accessToken = null;

// obtener usuario
async function getUserInfo(token) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return await res.json();
}

// buscar archivo
async function findFile() {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=name='asistencia.json'&spaces=appDataFolder",
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const data = await res.json();
  return data.files[0];
}

// leer
async function readData(fileId) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return await res.json();
}

// crear
async function createData(data) {
  const metadata = {
    name: "asistencia.json",
    parents: ["appDataFolder"]
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([JSON.stringify(data)], { type: "application/json" }));

  await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form
  });
}

// actualizar
async function updateData(fileId, data) {
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

// marcar asistencia
async function checkIn() {
  let file = await findFile();

  if (!file) {
    const data = { registros: [] };
    await createData(data);
    file = await findFile();
  }

  const data = await readData(file.id);

  data.registros.push({
    fecha: new Date().toISOString()
  });

  await updateData(file.id, data);

  document.getElementById("output").textContent =
    JSON.stringify(data, null, 2);
}

// INIT
async function init() {
  const tokenData = await handleRedirect();

  if (!tokenData) return;

  accessToken = tokenData.access_token;

  const user = await getUserInfo(accessToken);

  document.getElementById("user").textContent =
    `Hola ${user.name}`;

  document.getElementById("app").style.display = "block";

  document.getElementById("loginBtn").style.display = "none";

  document.getElementById("checkBtn").onclick = checkIn;

  // refresh automático
  setInterval(() => {
    silentRefresh();
  }, 45 * 60 * 1000);
}

init();