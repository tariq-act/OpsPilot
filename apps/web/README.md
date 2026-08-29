This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

The repository root README is the local development guide (prerequisites, env files, troubleshooting). From the root:

```bash
bun install
cp apps/web/.env.example apps/web/.env.local
bun run dev --filter=web
```

`bun run dev` from the root starts web and API together. Or from this directory after a root install: `bun run dev`.

Open [http://localhost:3001](http://localhost:3001) (the app is configured on port 3001 so it does not collide with the API on 3000).

No environment variables are required. Copy `.env.example` to `.env.local` for local overrides. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser; never put secrets in them. PostgreSQL is an API concern and is not required to run the web app today.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
