# MyDoc - Gestionale Prenotazioni Studio Medico

Sistema web per la gestione di uno studio medico monodottore.

## Stack Tecnologico

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database:** Cloudflare D1 (SQLite) in produzione, better-sqlite3 locale per i test
- **ORM:** Drizzle ORM
- **UI:** Tailwind CSS + shadcn/ui
- **Autenticazione:** Iron Session (cookie-based)
- **Linguaggio:** TypeScript

## Requisiti

- Node.js 22+
- npm 10+

## Installazione

```bash
npm install
```

## Configurazione

Copia il file di esempio e configura le variabili d'ambiente:

```bash
cp .env.example .env.local
```

Variabili richieste:

| Variabile | Descrizione |
|-----------|-------------|
| `ADMIN_PASSWORD` | Password per accedere all'app |
| `SESSION_SECRET` | Chiave segreta per le sessioni (minimo 32 caratteri) |

## Sviluppo Locale

### Avvio del server di sviluppo

```bash
npm run dev
```

L'app sarà disponibile su [http://localhost:3000](http://localhost:3000).

### Database

Il progetto usa Cloudflare D1 (SQLite) come database. Per lo sviluppo locale:

1. **Crea il database locale** (se non esiste):
   ```bash
   npx wrangler d1 create mydoc-local
   ```

2. **Applica le migrazioni**:
   ```bash
   npm run db:migrate
   ```

3. **Genera nuove migrazioni** (dopo modifiche allo schema):
   ```bash
   npm run db:generate
   ```

Il database di sviluppo è gestito automaticamente da Wrangler in locale. Non serve installare SQLite separatamente.

## Comandi Disponibili

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Avvia il server di sviluppo |
| `npm run build` | Build per produzione (Cloudflare Workers) |
| `npm run start` | Avvia il server di produzione |
| `npm run preview` | Preview locale con Wrangler |
| `npm run deploy` | Deploy su Cloudflare Workers |
| `npm run db:generate` | Genera migrazioni Drizzle |
| `npm run db:migrate` | Applica migrazioni al DB locale |
| `npm run db:migrate:prod` | Applica migrazioni in produzione |
| `npm test` | Esegue i test unitari (Vitest) |
| `npm run test:e2e` | Esegue i test end-to-end (Playwright) |
| `npm run lint` | Esegue il linter |

## Testing

I test usano **Vitest** con un database SQLite in-memory (better-sqlite3) per isolare i test dal database di sviluppo.

```bash
# Tutti i test
npm test

# Test in watch mode
npm test -- --watch

# Test con coverage
npm test -- --coverage

# Solo i test di un file specifico
npm test -- src/__tests__/pazienti.test.ts
```

I test end-to-end usano **Playwright**:

```bash
npm run test:e2e
```

## Struttura del Progetto

```
src/
├── actions/          # Server Actions (mutazioni DB)
├── app/              # Route Next.js (App Router)
│   ├── (auth)/       # Login
│   └── (dashboard)/  # Pagine protette
├── components/       # Componenti React
│   ├── layout/       # Sidebar, Header
│   ├── pazienti/     # UI pazienti
│   ├── richieste/    # UI richieste
│   ├── calendario/   # UI calendario
│   └── ui/           # Componenti shadcn/ui
├── db/               # Schema Drizzle + migrazioni
├── lib/              # Utility condivise
└── __tests__/        # Test unitari
```

## Deploy

L'app viene deployata su **Cloudflare Workers** con OpenNext:

```bash
npm run deploy
```

Le migrazioni del database vengono applicate automaticamente durante il deploy.

## Licenza

MIT
