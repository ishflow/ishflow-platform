# Contributing

> ishflow is published as a showcase and active development has stopped. Issues and pull requests are not being reviewed (see the README). The conventions below describe how the project was developed.

## Branching

- `main` — always deployable.
- Feature branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`.

## Commit Messages

[Conventional Commits](https://www.conventionalcommits.org/). Enforced by commitlint.

Examples:

- `feat: add Customer catalog`
- `fix: guard against negative stock on sales invoice`
- `chore: bump Prisma to 5.22`
- `docs: describe new DSL helpers`

## Pull Requests

- One logical change per PR.
- All CI checks must pass.
- Migration changes include the generated SQL in the PR.
- Update docs in the same PR when behaviour changes.

## Local Development Checklist

Before opening a PR:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
```

## Secrets

Never commit a secret. Use `op inject -i .env.local.tpl -o .env.local`. Add new secret references to `.env.local.tpl`, push the value into the correct 1Password item (`<vault>` vault), and document the item name in the file header.

## i18n

Every new user-facing string must be added to `messages/en.json` AND `messages/ru.json` (at minimum). Other locales may initially mirror `en`.

## Theme

All new components must work in light and dark mode. Use shadcn color tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`), not raw Tailwind colors (`bg-zinc-50`, etc.).
