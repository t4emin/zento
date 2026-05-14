# Zento Deployment

## Recommended production stack

- Hosting: Vercel
- Database: Neon Postgres or Supabase Postgres
- ORM: Prisma
- Runtime auth: email/password with signed HTTP-only cookie sessions

## Required environment variables

Use [.env.production.example](/Users/manat/Documents/zento/.env.production.example) as the base.

Required:
- `DATABASE_URL`
- `SESSION_SECRET`

Optional:
- `SESSION_COOKIE_DOMAIN`
- `SEED_DEMO_OWNER_EMAIL`
- `SEED_DEMO_OWNER_NAME`
- `SEED_DEMO_OWNER_PASSWORD`

Rules:
- `SESSION_SECRET` must be at least 32 characters
- `DATABASE_URL` must target the production Postgres instance
- `SESSION_COOKIE_DOMAIN` should be set when you want to pin the cookie domain explicitly

## Neon setup

1. Create a Neon project and database.
2. Copy the Postgres connection string.
3. Set `DATABASE_URL` in your deployment platform.
4. Ensure SSL is enabled in the connection string.

Example:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/zento?sslmode=require"
```

## Supabase setup

1. Create a Supabase project.
2. Open Project Settings -> Database.
3. Copy the Postgres connection string.
4. Set `DATABASE_URL` in your deployment platform.
5. Confirm SSL parameters are present.

## Prisma commands

Generate client:
```bash
npm run prisma:generate
```

Validate schema:
```bash
npm run prisma:validate
```

Validate env:
```bash
npm run env:check
```

Development migration:
```bash
npm run prisma:migrate -- --name init
```

Production migration:
```bash
npm run prisma:migrate:deploy
```

Seed production or staging:
```bash
npm run prisma:seed
```

## Production login seed

The seed script creates the demo owner from env vars:

- `SEED_DEMO_OWNER_EMAIL`
- `SEED_DEMO_OWNER_NAME`
- `SEED_DEMO_OWNER_PASSWORD`

Defaults outside production:
- email: `demo@zento.dev`
- name: `Demo Owner`
- password: `demo1234`

Important:
- In production, `SEED_DEMO_OWNER_PASSWORD` must be set or seeding fails
- Change the demo credentials before exposing any public deployment

## Vercel deployment steps

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Add production env vars:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `SESSION_COOKIE_DOMAIN` if needed
   - seed env vars if you will run `prisma:seed`
4. Keep the install command as `npm install`.
   - `postinstall` already runs `prisma generate`
5. Use the build command:
```bash
npm run build
```
6. Before serving traffic, deploy database migrations:
```bash
npm run prisma:migrate:deploy
```

## Recommended release order

1. Set production env vars
2. Run `npm run env:check`
3. Run `npm run prisma:validate`
4. Run `npm run prisma:migrate:deploy`
5. Run `npm run prisma:seed` if you need the demo restaurant and login
6. Deploy the app build

## Troubleshooting

### Build fails because Prisma Client is missing

Run:
```bash
npm run prisma:generate
```

`postinstall` also runs `prisma generate`.

### Build or runtime fails because env is missing

Run:
```bash
npm run env:check
```

Check:
- `DATABASE_URL` exists
- `SESSION_SECRET` exists
- `SESSION_SECRET` is at least 32 characters

### Login fails in production

Check:
- the `users` table contains the seeded owner account
- `SEED_DEMO_OWNER_PASSWORD` was set during seeding
- `SESSION_SECRET` is configured correctly

### Session cookie is not sticking

Check:
- the site is served over HTTPS
- `SESSION_COOKIE_DOMAIN` matches the production domain when set
- browser devtools show `zento_staff_session` as `HttpOnly`

### API routes fail with database errors

Check:
- `DATABASE_URL` is valid
- the database accepts application connections
- `npm run prisma:migrate:deploy` has been run

### Seed fails in production

Check:
- `SEED_DEMO_OWNER_PASSWORD` is set
- `DATABASE_URL` points to the correct database
