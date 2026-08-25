# 🚀 Deploy Rival Hub su Railway - Guida Passo-Passo

## Prerequisiti
- Account GitHub con il codice del progetto
- Account Railway (gratuito): https://railway.app

---

## STEP 1: Crea Account Railway

1. Vai su https://railway.app
2. Clicca **"Login"** → **"Login with GitHub"**
3. Autorizza Railway ad accedere al tuo GitHub

---

## STEP 2: Crea Nuovo Progetto

1. Dalla dashboard Railway, clicca **"New Project"**
2. Seleziona **"Deploy from GitHub repo"**
3. Seleziona il repository del progetto Rival Hub
4. Railway rileverà automaticamente il Dockerfile

---

## STEP 3: Aggiungi MongoDB

1. Nel progetto, clicca **"New"** → **"Database"** → **"MongoDB"**
2. Railway creerà automaticamente un database MongoDB
3. Copia la variabile `MONGO_URL` (es: `mongodb://mongo:***@containers-us-west-xxx.railway.app:xxxx`)

---

## STEP 4: Configura Variabili Ambiente

1. Clicca sul servizio principale (quello con il Dockerfile)
2. Vai su **"Variables"**
3. Aggiungi queste variabili:

```
MONGO_URL=<incolla l'URL MongoDB dal passo 3>
JWT_SECRET=<genera una stringa random sicura, es: openssl rand -hex 32>
PORT=8001
PYTHONUNBUFFERED=1
```

**Per generare JWT_SECRET:**
- Vai su https://generate-secret.vercel.app/32
- Oppure usa: `openssl rand -hex 32` nel terminale

---

## STEP 5: Deploy

1. Railway farà il deploy automaticamente
2. Aspetta che la build finisca (circa 5-10 minuti la prima volta)
3. Una volta completato, vedrai un URL tipo: `rivalhub-production.up.railway.app`

---

## STEP 6: Configura Dominio Personalizzato

### Su Railway:
1. Vai su **"Settings"** → **"Domains"**
2. Clicca **"Custom Domain"**
3. Inserisci: `www.rivalhub.app`
4. Railway ti darà un valore CNAME (es: `xxxx.up.railway.app`)

### Su Hostinger (DNS Zone):

**Per www.rivalhub.app:**
```
Type: CNAME
Name: www
Value: [il valore CNAME dato da Railway]
TTL: 14400
```

**Per rivalhub.app (redirect):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 14400
```

**Oppure usa il redirect di Hostinger:**
1. Vai su **Redirects** nel pannello Hostinger
2. Aggiungi redirect da `rivalhub.app` → `https://www.rivalhub.app`

---

## STEP 7: Abilita HTTPS

Railway abilita automaticamente HTTPS con Let's Encrypt per i domini custom.
Aspetta qualche minuto dopo aver configurato il DNS.

---

## STEP 8: Verifica

Dopo la propagazione DNS (può richiedere fino a 48 ore, solitamente 5-30 minuti):

1. **Homepage:** https://www.rivalhub.app
2. **API Health:** https://www.rivalhub.app/api/health
3. **Login:** https://www.rivalhub.app/login

---

## Costi Railway

**Piano Gratuito (Hobby):**
- $5 di crediti gratuiti al mese
- Sufficiente per app con traffico moderato
- Nessuna carta di credito richiesta

**Piano Pro ($20/mese):**
- Risorse illimitate
- Supporto prioritario
- Team collaboration

---

## Troubleshooting

### Build fallita
- Controlla i log di build in Railway
- Verifica che il Dockerfile sia corretto
- Controlla che requirements.txt sia completo

### 502 Bad Gateway
- Il servizio sta ancora avviando, aspetta qualche secondo
- Controlla i log del deployment

### MongoDB non si connette
- Verifica che MONGO_URL sia corretta
- Assicurati che il servizio MongoDB sia attivo

### DNS non funziona
- Aspetta la propagazione (fino a 48h)
- Verifica i record su https://dnschecker.org

---

## Comandi Utili

**Vedere i log in tempo reale:**
Railway Dashboard → Servizio → "Deployments" → "View Logs"

**Riavviare il servizio:**
Railway Dashboard → Servizio → "Settings" → "Restart"

**Aggiornare dopo modifiche al codice:**
Fai push su GitHub, Railway farà il deploy automatico.
