# LincolnEstate Resident App

The resident side of the LincolnEstate estate management system. Residents can see what is
happening in their estate, manage their household and properties, track family check-ins and
check-outs at the gate, and send an emergency alert to estate security.

The project has three parts that share one API:

| Part | Stack | Folder |
|---|---|---|
| Web app | Next.js 15, React 19, TypeScript, Tailwind CSS v4 | [`frontend/`](frontend) |
| Mobile app (iOS + Android) | Expo, React Native, Expo Router, TypeScript | [`mobile/`](mobile) |
| API | Laravel 13, PHP 8.3+, Sanctum token auth | [`backend/`](backend) |

## Features

- **Sign up and sign in**: new residents create an account with their name, email, phone and a
  password, and are signed in straight away
- **Dashboard**: estate updates, upcoming reminders (which you can mark as done) and a quick
  overview of the household
- **Emergency alert**: a "life under threat" / SOS button, on every screen, that alerts estate
  security after you confirm
- **Profile**: personal details and an About section
- **Family members**: add, edit and remove the people in your household
- **Properties**: register and manage your vehicles and other property
- **Activity**: family gate check-ins and check-outs, which you can filter by day
- **Estate map**: an interactive map of plots and roads in the estate
- **Messages**: an estate chatroom for all residents, plus one-to-one chats with neighbours.
  New messages arrive within a few seconds, and an unread badge shows on the Messages link.
  Residents who turn off "All Members Can Chat With Me" can't be messaged directly.
- **Settings**: SMS and email notifications, chat preferences and password change

Finance and Store are placeholders for now.

## Project structure

```
estate-resident-app/
├── backend/            Laravel API
│   ├── app/Http/       controllers, form requests, API resources
│   ├── app/Models/     Eloquent models
│   ├── database/       migrations, factories, demo seeder
│   ├── routes/api.php  every API route
│   └── tests/Feature/  a feature test for each endpoint
├── frontend/           Next.js web app
│   └── src/
│       ├── app/        pages (App Router)
│       ├── components/ layout shell and shared UI
│       └── lib/        API client, types, sample data
├── mobile/             Expo app
│   ├── app/            screens (Expo Router)
│   └── src/            components, API client, session, types
└── .github/workflows/  CI
```

## Getting started

### Requirements

- PHP 8.3+ and Composer
- Node.js 22 LTS and npm
- The Expo Go app on your phone, if you want to run the mobile app on a device

### 1. API

```bash
cd backend
composer run setup        # installs dependencies, creates .env and the SQLite database, migrates and seeds
php artisan storage:link
php artisan serve         # http://localhost:8000
```

Demo account: **broklyn@gmail.com** / **password**

The API uses SQLite for local development. On a real server, use PostgreSQL. Set
`DB_CONNECTION=pgsql` and the `DB_*` values in `backend/.env`. `FRONTEND_URL` sets which origin is allowed to call the API (CORS). You can set
the estate name and emergency line with `ESTATE_NAME` and `ESTATE_EMERGENCY_LINE`.

### 2. Web app

```bash
cd frontend
npm install
npm run dev               # http://localhost:3000
```

To connect to the API, create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Mobile app

```bash
cd mobile
npm install
npm start                 # scan the QR code with Expo Go
```

A phone can't reach `localhost` on your computer. To connect to the API, start Laravel with
`php artisan serve --host=0.0.0.0`. Then copy `mobile/.env.example` to `mobile/.env` and set
`EXPO_PUBLIC_API_URL` to your computer's address on the Wi-Fi network, for example
`http://192.168.1.10:8000/api`. See [`mobile/README.md`](mobile/README.md) for simulators and
store builds.

> **Sample data mode:** if no API URL is set, the web and mobile apps both run on built-in
> sample data (`src/lib/mock-data.ts`). You can try the UI this way without running the backend.
> Changes last until you reload the page or restart the app.

## API

All endpoints are under `/api`. Every endpoint except sign-up and login needs an
`Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | `{name, email, phone?, password, password_confirmation}`, returns `{token, user}` |
| POST | `/auth/login` | `{email, password}`, returns `{token, user}` |
| POST | `/auth/logout` | Revoke the current token |
| GET | `/resident/dashboard` | Dashboard data |
| GET / PUT | `/resident/profile` | View or update `name`, `phone`, `about` |
| GET / POST | `/resident/family-members` | List, or add `{name, role, age, gender}` |
| PUT / DELETE | `/resident/family-members/{id}` | Update or remove a family member |
| GET / POST | `/resident/properties` | List, or add `{type, name, number, colour, details}` |
| PUT / DELETE | `/resident/properties/{id}` | Update or remove a property |
| GET | `/resident/activities?date=YYYY-MM-DD` | Gate activity (`date` is optional) |
| PATCH | `/resident/reminders/{id}` | `{done}`, mark a reminder as done |
| GET / PUT | `/resident/settings` | `{smsNotifications, emailNotifications, allowChat}` |
| PUT | `/resident/password` | `{current_password, password, password_confirmation}` |
| POST | `/resident/emergency-alerts` | Send an emergency alert |
| GET | `/resident/conversations` | The estate chatroom, then one-to-one chats, with last message and unread count |
| POST | `/resident/conversations` | `{residentId}`, open (or start) a one-to-one chat |
| GET | `/resident/conversations/unread` | `{count}`, total unread messages |
| GET | `/resident/conversations/{id}` | One chat |
| GET | `/resident/conversations/{id}/messages` | Latest 50 messages (marks them read). `?after={id}` for newer, `?before={id}` for older |
| POST | `/resident/conversations/{id}/messages` | `{body}`, send a message (max 2000 characters) |
| GET | `/resident/neighbours?q=` | Residents who accept messages (name, resident code, plot only) |
| GET | `/estate/map` | Plots and roads for the estate map |

Responses use Laravel API Resources, wrapped in `{ "data": ... }`, with camelCase fields. The
TypeScript shapes are in `frontend/src/lib/types.ts`. Sign-up, login, emergency alerts and
sending messages are rate-limited.

The apps check for new messages every 4 seconds while a chat is open, every 10 seconds on the
chat list, and every 30 seconds for the unread badge. They stop checking while the tab or app is
in the background.

Gate activity, estate updates, payments and map plots are read-only in this app. The admin and
security parts of the system write them.

## Testing

```bash
# API
cd backend && php artisan test && vendor/bin/pint --test

# Web
cd frontend && npm run lint && npm run build

# Mobile
cd mobile && npm run typecheck && npx expo-doctor
```

GitHub Actions runs all of these on every push and pull request. It runs the API tests twice:
once on SQLite, and once on PostgreSQL 16. The PostgreSQL job also makes a backup with
`db:backup`, restores it into a new database and checks that the data matches.

## Backups

```bash
php artisan db:backup         # back up now (also runs nightly through the scheduler)
```

Backups go to `BACKUP_PATH` (default `backend/storage/app/backups`). Backups older than
`BACKUP_KEEP_DAYS` (default 14) are deleted. The demo data is never loaded when `APP_ENV=production`.

The nightly backup needs Laravel's scheduler running on the server:
`* * * * * cd /path/to/backend && php artisan schedule:run`.
