# Continuous integration checklist

Recommended GitHub Actions workflow:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
```

**Before enabling CI:** run `npm install` once locally to create and commit `package-lock.json`. In this environment npm install could not run due registry network failures, so a lockfile was not generated. `npm ci` requires a committed lockfile.

Then add Docker/PostgreSQL service for integration tests and `prisma migrate deploy` as a separate staging gate. Do not automatically seed demo admin in production.
