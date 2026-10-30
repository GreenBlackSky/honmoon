# Publishing Honmoon and building the apps on GitHub

Not set up yet. This is the plan for when the four repos are on GitHub
(`github.com/GreenBlackSky/honmoon`, `/mira`, `/rumi`, `/zoey`) and you
want GitHub to build (and later deploy) the apps for you.

The package is called **`@greenblacksky/honmoon`**. The scope (`@greenblacksky`)
is your account name in lowercase, and the engine keeps its own name after
the slash.

## Why publishing is needed at all

In the local workspace, `@greenblacksky/honmoon` is linked straight to
the `honmoon/` folder. GitHub builds each repo on a
fresh, empty machine that has only *that one repo*. There, `mira` asks for
`@greenblacksky/honmoon ^0.4.0` and npm has nowhere to find it.

Publishing fixes that. You upload a numbered copy of Honmoon to a package
registry, and every app installs it from there.

Nothing changes locally. The workspace still links the local folder, as
long as its version fits the range the apps ask for.

## Where: npmjs.com (public) or GitHub Packages (private)

| | **npmjs.com**, public | **GitHub Packages**, private |
|---|---|---|
| Who can install | anyone, no login | only you and repos you allow |
| Installing on GitHub | nothing to set up | a token and a per-repo permission |
| Account | a free npmjs.com account | your GitHub account |
| Scope must match | your **npm** username (or an npm org) | your **GitHub** username |
| Cost | free for public packages | free within the plan's limits |

For a public package, use **npmjs.com**. GitHub Packages asks for a login
even to install *public* packages, so it adds work and gives nothing back.

### Before the first public release

- **npm account:** create one on npmjs.com named `greenblacksky`, so the
  `@greenblacksky` scope is yours. (If that name is taken, create a free
  npm *organisation* called `greenblacksky` instead. Either one owns the
  scope.)
- **Licence:** done. Honmoon is MIT (`LICENSE`, and `"license": "MIT"`
  in `package.json`).
- **Anything private:** everything in `src/lib` becomes readable by
  anyone, forever. Published versions can't really be taken back.
- **Name check:** the HUNTR/X nod is only in names and the README, with no
  art, logos or quotes, so it's fine as it is.

### Changes to `honmoon/package.json`

```jsonc
{
  "name": "@greenblacksky/honmoon",
  // "private": true,          ← remove: npm refuses to publish private packages
  "license": "MIT",            // already set
  "repository": {
    "type": "git",
    "url": "git+https://github.com/GreenBlackSky/honmoon.git"
  },
  "publishConfig": { "access": "public" }   // scoped packages are private by default
}
```

## What gets published

Honmoon's `package.json` points at the TypeScript and Svelte source in
`src/lib`, and the apps' Vite build already compiles that source on the fly.
The simplest choice is to publish the source just as it is. The app build
on GitHub then does what it already does here. (Many Svelte libraries ship
`.svelte` source the same way.) The `files` field already limits the upload
to `src/lib`.

The other choice is `npm run package`, which writes compiled JavaScript to
`dist/`. Then `exports` would have to point at `dist/` for the published
copy but at `src/lib` for local work, and that's easy to get wrong. Keep it
for later, if a published copy ever needs to work outside Vite.

To see exactly what would be uploaded, without uploading anything:

```
npm pack --dry-run
```

## The pipeline: GitHub Actions

GitHub Actions runs a script on a fresh Linux machine whenever something
happens in a repo (a push, a tag, a pull request). The script is a YAML
file in `.github/workflows/`. Think of it as a `Makefile` that GitHub runs
for you and reports on with a ✓ or ✗ next to each commit.

The plan is two kinds of workflow:

```
honmoon repo                         each app repo (mira, rumi, zoey)
────────────                         ───────────────────────────────
push / pull request                  push / pull request
  → check, lint, test                  → install @greenblacksky/honmoon from npm
                                       → check, lint, build, Playwright tests
tag v0.5.0                           push to main (later, with Firebase)
  → check, lint, test                  → build, deploy dist/ to Firebase Hosting
  → publish @greenblacksky/honmoon 0.5.0
```

### Releasing a new engine version

From the `honmoon` folder:

```
npm version minor          0.4.0 → 0.5.0, commits and tags v0.5.0
git push --follow-tags     GitHub sees the tag and publishes
```

Then raise the range in each app (`"@greenblacksky/honmoon": "^0.5.0"`), if
the apps need the new version.

### Letting GitHub publish: trusted publishing

There's no password or token to store. On npmjs.com, open the package's
*Settings* → *Trusted publishing*, choose GitHub Actions, and enter the
repo (`GreenBlackSky/honmoon`) and workflow file (`publish.yml`). After
that, npm accepts uploads from that workflow only. It also marks each
version with *provenance*, a public note showing which commit it was built
from.

The very first version has to exist before you can open its settings. So
publish `0.4.0` once by hand from your own machine (`npm login`, then `npm publish`
in `honmoon/`), and let GitHub do every release after that. (Trusted
publishing is newish. If npm's screens look different when you set it up,
its documentation has the current steps.)

### `honmoon/.github/workflows/publish.yml`

```yaml
name: Publish
on:
  push:
    tags: ['v*']
permissions:
  contents: read
  id-token: write          # proves to npm that this run is the trusted workflow
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm install -g npm@latest   # trusted publishing needs a recent npm
      - run: npm install
      - run: npm run check
      - run: npm run lint
      - run: npm test
      - run: npm publish
```

### `mira/.github/workflows/ci.yml` (same for rumi and zoey)

```yaml
name: CI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install    # finds @greenblacksky/honmoon on npmjs.com
      - run: npm run check
      - run: npm run lint
      - run: npx playwright install --with-deps chromium
      - run: npm test       # builds dist/ and runs the Playwright tests
```

The package is public, so the apps need no token or permissions to install
it.

### Deploying (later, with Firebase)

Once the Firebase project exists (see the Firebase section in CLAUDE.md),
add a deploy job to each app's workflow that runs on pushes to `main`.
Firebase's official action `FirebaseExtended/action-hosting-deploy` uploads
`dist/` to that app's Hosting site. It needs one secret, a Firebase service
account key, saved under the repo's *Settings → Secrets and variables →
Actions*. It never goes in the code. Pull requests can get a temporary
preview address the same way.

## If you'd rather keep it private

Use GitHub Packages instead. The differences from the above:

- **package.json:** `"publishConfig": { "registry": "https://npm.pkg.github.com" }`
  instead of `"access": "public"`.
- **Both workflows:** `setup-node` gets
  `registry-url: https://npm.pkg.github.com` and `scope: '@greenblacksky'`.
- **Publish workflow:** needs `packages: write` permission, and
  `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on the `npm publish` step.
- **App workflows:** need `packages: read`, and the same `NODE_AUTH_TOKEN`
  on `npm install`.
- **Access:** on GitHub, open the package → *Package settings* →
  *Manage Actions access* → add `mira`, `rumi` and `zoey`.

## Things to know

- **No lock file on GitHub.** The workspace's single `package-lock.json`
  lives in `apps/`, which isn't in any repo, so GitHub runs `npm install`
  without one. Versions can drift slightly from the ones installed locally. The
  tools are pinned to exact versions in each `package.json`, so the risk is
  small.
- **Published versions are permanent.** You can't re-publish `0.5.0` with
  different contents. Bump to `0.5.1` instead.
- **Not tested yet.** The workflows above are a starting point. The first
  real run will show whether anything needs adjusting.
