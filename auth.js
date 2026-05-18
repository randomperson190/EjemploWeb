const CLIENT_ID = "54886740879-bhbtkpd85av0mq44hc3qbqd87neaffc0.apps.googleusercontent.com";
const API_KEY = ""; // opcional

const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let tokenClient;
let accessToken = null;

function login() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
            accessToken = response.access_token;
            document.getElementById("estado").innerText = "Logueado ✅";
        },
    });

    tokenClient.requestAccessToken();
}

async function guardar() {
    if (!accessToken) {
        alert("Primero logueate");
        return;
    }

    const contenido = document.getElementById("input").value;

    const file = new Blob([JSON.stringify({ dato: contenido })], {
        type: "application/json",
    });

    const metadata = {
        name: "mi_app_data.json",
        mimeType: "application/json",
    };

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);

    const res = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
            method: "POST",
            headers: new Headers({ Authorization: "Bearer " + accessToken }),
            body: form,
        }
    );

    const data = await res.json();
    document.getElementById("estado").innerText = "Guardado en Drive ✅";
    console.log(data);
}