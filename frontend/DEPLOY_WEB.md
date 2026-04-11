# Rival Hub - Guida Deploy Web App Full Stack

## Architettura
La Web App è ora **Full Stack**: il backend FastAPI serve sia le API che il frontend web.
- **Backend:** FastAPI (Python) - porta 8001
- **Frontend:** Expo Web (React Native) - servito dal backend
- **Database:** MongoDB

## OPZIONE 1: Deploy su VPS/Server (Consigliato)

### Requisiti Server
- Ubuntu 20.04+ o simile
- Python 3.9+
- Node.js 18+
- MongoDB (locale o Atlas)

### Passi per il Deploy

1. **Clona il repository sul server:**
```bash
git clone <your-repo> /var/www/rivalhub
cd /var/www/rivalhub
```

2. **Setup Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Setup Frontend e Build:**
```bash
cd ../frontend
yarn install
yarn build:web
```

4. **Configura variabili ambiente:**
```bash
# backend/.env
MONGO_URL=mongodb://localhost:27017
JWT_SECRET=your-secret-key
```

5. **Avvia con systemd:**
```bash
# /etc/systemd/system/rivalhub.service
[Unit]
Description=Rival Hub API
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/rivalhub/backend
ExecStart=/var/www/rivalhub/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

6. **Configura Nginx come reverse proxy:**
```nginx
server {
    listen 80;
    server_name www.rivalhub.app rivalhub.app;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.rivalhub.app rivalhub.app;

    ssl_certificate /etc/letsencrypt/live/rivalhub.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rivalhub.app/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## OPZIONE 2: Deploy su Hostinger VPS

Se hai un **VPS Hostinger** (non hosting condiviso), segui l'Opzione 1.

### DNS da configurare su Hostinger:

```
Type: A
Name: @
Value: [IP del tuo VPS]
TTL: 14400

Type: A
Name: www
Value: [IP del tuo VPS]
TTL: 14400
```

### Oppure con CNAME (se usi Cloudflare o altro CDN):
```
Type: CNAME
Name: www
Value: rivalhub.app
TTL: 14400
```

---

## OPZIONE 3: Deploy su Railway/Render (PaaS)

### Railway (Gratuito per progetti piccoli)
1. Vai su https://railway.app
2. Crea nuovo progetto
3. Collega il repository GitHub
4. Railway rileverà automaticamente il Dockerfile o il setup Python/Node
5. Configura le variabili ambiente nel pannello Railway
6. Ottieni l'URL del deploy (es: `rivalhub.up.railway.app`)
7. Configura DNS custom per www.rivalhub.app

### DNS per Railway:
```
Type: CNAME
Name: www
Value: [your-project].up.railway.app
TTL: 14400
```

---

## OPZIONE 4: Deploy Statico su Hostinger (Solo Frontend)

Se vuoi usare l'**hosting condiviso** di Hostinger (non VPS), puoi deployare solo il frontend statico e usare un backend separato (es. su Railway).

### Passi:
1. Build frontend: `yarn build:web`
2. Carica la cartella `dist/` su Hostinger via FTP
3. Configura il backend su un servizio esterno
4. Aggiorna `EXPO_PUBLIC_BACKEND_URL` nel frontend

---

## Verifica Deploy

Dopo il deploy, verifica che funzionino:
- https://www.rivalhub.app → Homepage
- https://www.rivalhub.app/api/health → `{"status":"healthy"}`
- https://www.rivalhub.app/tournament/[id] → Pagina torneo
- https://rivalhub.app → Redirect a www

## Deep Linking

I link funzionano sia su web che su app:
- **Web:** `https://www.rivalhub.app/tournament/[tournament_id]`
- **App Mobile:** `rivalhub://tournament/[tournament_id]`
