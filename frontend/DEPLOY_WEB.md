# Rival Hub - Guida Deploy Web App su Hostinger

## Prerequisiti
- Account Hostinger con hosting web attivo
- Dominio www.rivalhub.app configurato
- Accesso FTP o File Manager

## 1. Build della Web App

Esegui la build web dal terminale:

```bash
cd /app/frontend
yarn build:web
```

Questo creerà una cartella `dist/` con tutti i file statici.

## 2. Upload su Hostinger

### Opzione A: File Manager
1. Accedi al pannello Hostinger
2. Vai su **File Manager** → **public_html**
3. Elimina tutti i file esistenti (se presenti)
4. Carica il contenuto della cartella `dist/`
5. Carica anche i file dalla cartella `public/`:
   - `.htaccess`
   - `manifest.json`
   - `og-image.jpg`
   - `favicon.png`
   - `icon.png`

### Opzione B: FTP
1. Usa un client FTP (FileZilla, Cyberduck)
2. Connettiti con le credenziali Hostinger
3. Carica i file nella cartella `public_html`

## 3. Configurazione DNS

Nel pannello Hostinger → **Domains** → **DNS Zone**:

### Per www.rivalhub.app (principale):
```
Type: A
Name: www
Points to: [IP del tuo hosting Hostinger]
TTL: 14400
```

### Per rivalhub.app (redirect a www):
```
Type: A
Name: @
Points to: [IP del tuo hosting Hostinger]
TTL: 14400
```

### Opzionale - CNAME per www:
```
Type: CNAME
Name: www
Points to: rivalhub.app
TTL: 14400
```

## 4. SSL Certificate

1. Vai su **SSL** nel pannello Hostinger
2. Installa il certificato Let's Encrypt gratuito
3. Abilita "Force HTTPS"

## 5. Verifica

Dopo il deploy, verifica che funzionino:
- https://www.rivalhub.app → Homepage
- https://www.rivalhub.app/tournament/[id] → Pagina torneo
- https://rivalhub.app → Redirect a www

## 6. Deep Linking Web

I link ai tornei funzionano con questo formato:
- **Web:** `https://www.rivalhub.app/tournament/[tournament_id]`
- **App:** `rivalhub://tournament/[tournament_id]`

## Struttura File dopo Deploy

```
public_html/
├── index.html
├── .htaccess
├── manifest.json
├── favicon.png
├── icon.png
├── og-image.jpg
├── _expo/
│   └── static/
│       └── [files...]
└── assets/
    └── [images, fonts...]
```

## Troubleshooting

### Pagine 404 su refresh
- Verifica che `.htaccess` sia stato caricato
- Verifica che mod_rewrite sia abilitato

### Immagini non caricate
- Verifica i permessi delle cartelle (755)
- Verifica che i path siano corretti

### SSL non funziona
- Aspetta qualche ora per la propagazione DNS
- Verifica che il certificato sia installato correttamente
