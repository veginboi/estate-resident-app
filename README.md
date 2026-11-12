# LincolnEstate: Resident App

The resident-facing part of the LincolnEstate estate management system.

```
estate-resident-app/
├── frontend/   Next.js 15 + TypeScript + Tailwind CSS v4
├── mobile/     Expo (React Native) app for iOS and Android
├── backend/    Laravel 13 API with Sanctum token auth
└── .github/    CI: backend tests, frontend lint/build and mobile checks on every push
```

## Running the backend

Requires PHP 8.3+ and Composer.

```bash
cd backend
composer run setup    # installs packages, creates .env + SQLite DB, migrates and seeds demo data
php artisan storage:link
php artisan serve     # http://localhost:8000
php artisan test      # feature tests for every endpoint
```

Demo login (from `DemoEstateSeeder`): **broklyn@gmail.com** / **password**

To use MySQL instead of SQLite, set `DB_CONNECTION=mysql` and the `DB_*` values in `backend/.env`.
`FRONTEND_URL` in `.env` controls which origin may call the API (CORS).

## Running the frontend

```bash
cd frontend
nvm use 22        # Node 26 doesn't run on macOS 12
npm install
npm run dev       # http://localhost:3000
```

Without a backend, the app runs on sample data from `src/lib/mock-data.ts`. Changes you make
(adding a family member, editing settings, etc.) last until you reload the page.

To use the Laravel API, create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Running the mobile app

```bash
cd mobile
nvm use 22
npm install
npm start         # scan the QR code with the Expo Go app on your phone
```

Like the web app, it runs on sample data until you point it at the API. See `mobile/README.md`.

## Jira tasks → pages

| Task | Route | Files |
|---|---|---|
| Resident dashboard (desktop + mobile) | `/dashboard` | `src/app/(resident)/dashboard/page.tsx` |
| (supporting) Login | `/login` | `src/app/login/page.tsx` |
| Resident profile + About | `/profile` | `src/app/(resident)/profile/layout.tsx`, `page.tsx` |
| Family members management | `/profile/family` | `src/app/(resident)/profile/family/page.tsx` |
| Property registration + management | `/profile/properties` | `src/app/(resident)/profile/properties/page.tsx` |
| Resident activity | `/activity` | `src/app/(resident)/activity/page.tsx` |
| Resident settings | `/profile/settings` | `src/app/(resident)/profile/settings/page.tsx` |
| Estate map | `/estate-map` | `src/app/(resident)/estate-map/page.tsx` |

The layout (sidebar, header, emergency button) is in `src/components/AppShell.tsx`.
Shared UI pieces are in `src/components/ui.tsx`.

## API contract for the Laravel backend

All frontend calls go through `frontend/src/lib/api.ts` (and `mobile/src/lib/api.ts` for the mobile app). Responses may be wrapped in
`{ "data": ... }` (Laravel API Resources). Field names are camelCase; the shapes are
in `frontend/src/lib/types.ts`.

| Method | Endpoint | Body / returns |
|---|---|---|
| GET | `/resident/dashboard` | `DashboardData` |
| POST | `/resident/emergency-alerts` | sends a "life under threat" alert |
| GET / PUT | `/resident/profile` | `Profile`; PUT accepts `name`, `phone`, `about` |
| GET / POST | `/resident/family-members` | `FamilyMember[]` / create `{name, role, age, gender}` |
| PUT / DELETE | `/resident/family-members/{id}` | update / remove |
| GET / POST | `/resident/properties` | `Property[]` / create `{type, name, number, colour, details}` |
| PUT / DELETE | `/resident/properties/{id}` | update / remove |
| GET | `/resident/activities?date=YYYY-MM-DD` | `Activity[]` (date is optional) |
| GET / PUT | `/resident/settings` | `{smsNotifications, emailNotifications, allowChat}` |
| PUT | `/resident/password` | `{current_password, password, password_confirmation}` |
| GET | `/estate/map` | `EstateMap` |

Authentication: `POST /auth/login` with `{email, password}` returns `{token, user}`. The frontend
stores the token and sends it as `Authorization: Bearer <token>`. `POST /auth/logout` revokes it.
`PATCH /resident/reminders/{id}` with `{done}` marks a dashboard reminder as done.

Gate activity, estate updates, payments and map plots are read-only here; they are written by
the admin/security side of the system.
