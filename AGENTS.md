# MyDoc - Gestionale Prenotazioni Studio Medico

## Panoramica Progetto

Sistema web per la gestione di uno studio medico monodottore. Obiettivi principali:
- Gestione centralizzata anagrafiche pazienti
- Registrazione richieste di visita (telefonate, messaggi, follow-up)
- Lista di lavorazione con stati chiari
- Auto-pianificazione richieste quando il medico inserisce disponibilità
- Riduzione tempi di attesa, doppie telefonate e no-show

**Stack Tecnologico:**
- Next.js 16 (App Router, Server Components, Server Actions)
- Cloudflare Workers + D1 (SQLite)
- Drizzle ORM
- Tailwind CSS + shadcn/ui
- Iron Session (autenticazione cookie-based)
- TypeScript

---

## Stato Attuale (Fase 1 Completata)

### Database Schema Implementato

```
patients
  - id (text, PK)
  - nome, cognome, telefono (required)
  - email, note (optional)
  - createdAt

requests
  - id (text, PK)
  - patientId (FK)
  - motivo, urgenza (bassa|media|alta)
  - stato (new|waiting|pending|confirmed|expired)
  - desiredDate (optional)
  - createdAt
```

### Funzionalità Implementate

- **Autenticazione:** Login con password singola (env-based)
- **Pazienti:** CRUD completo, ricerca, controllo duplicati telefono
- **Richieste:** CRUD completo, filtro per stato, badge colorati
- **Dashboard:** Metriche base (totali, in attesa, urgenti)
- **UI:** Sidebar, header, form validation, responsive base

### Pagine Esistenti

- `/login` - Autenticazione
- `/` - Dashboard con metriche
- `/pazienti` - Lista pazienti con ricerca
- `/pazienti/nuovo` - Creazione paziente
- `/pazienti/[id]` - Dettaglio paziente + sue richieste
- `/richieste` - Lista richieste con filtro stato

---

## Roadmap Implementazione

### Fase 2: Gestione Appuntamenti e Slot (PROSSIMA)

**Database - Nuove tabelle:**
```sql
appointments
  - id (text, PK)
  - requestId (FK)
  - patientId (FK)
  - slotId (FK)
  - dateTime
  - durataMin (default 30)
  - status (pending|confirmed|cancelled|expired)
  - expiresAt (TTL 48h per pending)
  - createdAt

doctorSlots
  - id (text, PK)
  - dateTime
  - durataMin (default 30)
  - isBooked (boolean)
  - recurringId (optional, per slot ricorrenti)
  - createdAt
```

**Funzionalità:**
- [ ] RF-04: `getNextAvailableSlot()` - Suggerisce primo slot libero >= data preferita
- [ ] RF-05: Dialog "Slot Proposto" con countdown TTL 48h
- [ ] Vista calendario settimanale/mensile
- [ ] Conferma/rifiuto appuntamento
- [ ] Transizione automatica stati richiesta

**Pagine:**
- `/calendario` - Vista calendario appuntamenti
- `/appuntamenti` - Lista appuntamenti

---

### Fase 3: Gestione Disponibilità Medico

**Funzionalità:**
- [ ] RF-06: Gestisci Disponibilità
  - Slot rapido (singolo)
  - Blocco giornaliero (es. 9:00-13:00 ogni 30min)
  - Ricorrenza settimanale
  - Import ICS/CSV
- [ ] UI per creazione slot multipli
- [ ] Gestione eccezioni/ferie

**Pagine:**
- `/disponibilita` - Gestione slot medico

---

### Fase 4: Auto-Assign e Scadenze

**Funzionalità:**
- [ ] RF-07: `autoAssignWaiting()` - Assegna automaticamente richieste `waiting` a nuovi slot
- [ ] RF-08: `expirePending()` - Cron job: slot non confermato → torna `waiting`
- [ ] Badge "Auto-assegnato" con filtro dedicato
- [ ] Logica priorità: urgenza > anzianità richiesta

**Cron Jobs (Cloudflare Scheduled Workers):**
- `expirePending` - ogni ora
- `autoAssignOnSlotCreate` - trigger su creazione slot

---

### Fase 5: Follow-up e Notifiche

**Database - Estensioni:**
```sql
requests (aggiunta)
  - autoFollowUp (boolean)
  - followUpDueAt (timestamp)

notifications_log
  - id, type, recipientId, message, sentAt, status
```

**Funzionalità:**
- [ ] RF-09: Follow-up automatico 30gg prima di `followUpDueAt`
- [ ] RF-11: Notifiche SMS/WhatsApp (Twilio) - opzionale
- [ ] Email reminder appuntamenti
- [ ] Digest giornaliero slot in scadenza

---

### Fase 6: Report e KPI

**Funzionalità:**
- [ ] RF-10: Dashboard KPI avanzata
  - Richieste totali per periodo
  - Urgenze evase < 48h (target 80%)
  - Richieste > 7gg in attesa
  - Tasso no-show (target < 5%)
  - Tempo medio triage
- [ ] Export report CSV/PDF
- [ ] Grafici trend temporali

**Pagine:**
- `/report` - Dashboard analytics

---

### Fase 7: UX Polish e Accessibilità

**Funzionalità:**
- [ ] Ricerca globale `Ctrl+K` (kbar)
- [ ] Countdown animato badge < 6h (pulse)
- [ ] Mobile card-list sotto 640px
- [ ] Sticky azioni mobile
- [ ] WCAG 2.1 AA compliance
- [ ] Dark mode (opzionale)

**UI Updates:**
- Palette: Indigo #3F4A96 (accent), Slate 900 bg
- Badge countdown con cambio colore: 24h / 6h soglie

---

### Fase 8: Multi-tenant e Sicurezza (v2)

**Database - Estensioni:**
```sql
-- Tutti i doc avranno tenantId
tenants
  - id, name, settings, createdAt

users
  - id, tenantId, email, role (admin|doctor|secretary)
  - passwordHash, lastLogin
```

**Funzionalità:**
- [ ] Google OAuth 2.0
- [ ] RBAC multi-utente
- [ ] Audit log completo
- [ ] Multi-studio (tenantId)

---

## Stati Richiesta (Flusso)

```
NEW ──────┬──> WAITING ──────> PENDING ──────> CONFIRMED
          │      ↑                 │
          │      └─────────────────┘
          │         (scade 48h)
          │
          └──> PENDING (slot trovato subito)
                    │
                    └──> EXPIRED (se non gestito)
```

**Legenda Badge:**
- `new` - Grigio chiaro ⚪
- `waiting` - Ambra 🟠
- `pending` (auto-assegnato) - Blu 🔵
- `confirmed` - Verde 🟢
- `expired` - Rosso 🔴

---

## Criteri di Accettazione Chiave

- **CA-01:** Creare paziente + richiesta + slot confermato in ≤ 60s
- **CA-02:** Auto-assign assegna 100% nuovi slot ai primi `waiting`
- **CA-03:** Badge countdown cambia colore a 24h / 6h
- **CA-04:** Report "Richieste > 7gg" corrisponde al count DB

---

## File Configurazione

- `.env.local` / `.dev.vars` - Variabili ambiente (ADMIN_PASSWORD, SESSION_SECRET)
- `wrangler.jsonc` - Config Cloudflare Workers
- `drizzle.config.ts` - Config Drizzle ORM
- `open-next.config.ts` - Config OpenNext per Cloudflare

---

## Comandi Utili

```bash
# Sviluppo
npm run dev              # Start Next.js dev server

# Database
npm run db:generate      # Genera migrazioni Drizzle
npm run db:migrate       # Applica migrazioni (local)
npm run db:migrate:prod  # Applica migrazioni (production)

# Build & Deploy
npm run build            # Build per Cloudflare
npm run preview          # Preview con Wrangler
npm run deploy           # Deploy su Cloudflare
```

---

## Note Tecniche

- **Cloudflare Context:** Richiede `initOpenNextCloudflareForDev()` in `next.config.ts`
- **Session:** Iron Session con cookie httpOnly
- **DB Access:** `getDb()` usa `getCloudflareContext()` per accedere a D1
- **Server Actions:** Tutte le mutazioni sono Server Actions con revalidatePath
