# Browser Audit — Backend

API de threat intelligence para el plan Pro.

## Requisitos

- Linux o WSL2 (better-sqlite3 requiere compilación nativa)
- Node.js 20 LTS
- Docker (recomendado para producción)

## Desarrollo local (Linux/WSL2)

```bash
cp .env.example .env
# edita .env — añade tus API_KEYS

npm install
npm run migrate   # crea el schema SQLite
npm run sync      # descarga feeds iniciales (~5min)
npm run dev       # servidor en watch mode → http://localhost:3000
```

## Docker (recomendado)

```bash
cp .env.example .env
echo "API_KEYS=mi-clave-secreta" >> .env

docker compose up --build
```

El servidor arranca en `http://localhost:3000` y sincroniza feeds automáticamente al iniciar.

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Estado del servidor y feeds |
| GET | `/baseline/latest` | No | Baseline de seguridad actual |
| GET | `/baseline/v1` | No | Baseline versión 1 |
| POST | `/lookup` | API Key | Consulta hashes SHA256 contra threat intel |

### POST /lookup

```json
// Request
{ "hashes": ["sha256hex1", "sha256hex2"] }

// Response
{
  "matches": [
    { "hash": "...", "type": "domain", "source": "urlhaus", "severity": "critical", "tags": [] }
  ],
  "queried": 2
}
```

Header requerido: `X-API-Key: <tu-clave>`

## Feeds sincronizados

| Fuente | Tipo | Frecuencia |
|--------|------|------------|
| URLhaus (abuse.ch) | Dominios maliciosos | Cada hora |
| MalwareBazaar (abuse.ch) | Hashes de malware | Cada hora |
| OpenPhish | Phishing | Cada 6h |
| DisconnectMe | Trackers | Diario |

## Deploy en producción (Hetzner CX21 — €5/mes)

```bash
# En el servidor
git clone <repo> && cd browser-audit/backend
cp .env.example .env && nano .env
docker compose up -d
```
