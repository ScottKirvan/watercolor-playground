# Contributing upstream from this fork

This repo is a fork of [msurguy/watercolor-playground](https://github.com/msurguy/watercolor-playground). Upstream gets only product changes, in the upstream author's style. The fork additionally carries our own layer: tests, `CLAUDE.md`, workflows and notes. This note describes how the two are kept apart.

## The two layers

**Product changes** are what upstream would want: source, assets, dependencies, `index.html`, `vite.config.ts`. They go to both repos.

**Fork-only paths** never go upstream:

- `CLAUDE.md`
- `notes/`
- `.github/` (release-please, release workflow, anything else of ours)
- `tests/`, `src/**/*.test.ts`
- `vitest.config.ts`, `playwright.config.ts`
- the test-related parts of `package.json`, `package-lock.json` and `tsconfig.json`

Upstream's own conventions differ from ours. His commit messages are plain imperative sentences ("Credit inkwash under its new MIT license"), not conventional commits, and his history has merge commits. He has no tests or lint config.

## Remotes and branches

| Name | What it is |
| --- | --- |
| `origin` | this fork |
| `upstream` | the upstream author's repo (read access only for us) |
| `upstream-main` | local branch that only fast-forwards from `upstream/main`. It never receives our commits, so it is always a clean copy of his code. [Proposed — unconfirmed: the name, and whether to push it to `origin`; for now it is local only.] |
| `main` | his code plus our layer plus any merged contributions. Never rewritten. Changes arrive by rebase and merge (so release-please keeps its notes), and upstream changes arrive by merge. |
| `contrib/<topic>` | a contribution branch built on `upstream/main` with product changes only. [Proposed — unconfirmed: the `contrib/` prefix.] |

Setup, once:

```bash
git remote add upstream https://github.com/msurguy/watercolor-playground
git fetch upstream
git branch upstream-main upstream/main
git branch --set-upstream-to=upstream/main upstream-main
```

## Making a contribution

1. Branch from upstream, not from `main`:
   `git switch -c contrib/<topic> upstream/main`
2. Put only the product change on it, with upstream-style commit messages and no attribution lines. Keep package-lock changes minimal: if it conflicts, take upstream's lockfile and rerun `npm install <package>` instead of resolving it by hand.
3. Check it as upstream would see it. In a throwaway worktree, run `npm ci && npm run build` on the branch. To also run our tests against it without committing them, copy them in from `main` (`git archive main tests playwright.config.ts vitest.config.ts src/project/<name>.test.ts | tar -x -C <worktree>`), then install the test tools with `npm i --no-save`. Remove the worktree afterwards.
4. Push the branch to `origin` and open the PR from it to `msurguy/watercolor-playground`. Opening a PR on his repo needs access the Claude session does not have, so that step is done by hand.
5. Open a PR from the same branch into `main` of this fork, if the feature is not already there. Merge it with rebase and merge.
6. Tests for the feature go in a follow-on `test:` PR to the fork only, on top of the feature. This is a deliberate exception to the "tests alongside new code" rule in `CLAUDE.md`: the tests land in a separate PR for the same feature, because upstream does not take them.

If a feature was already merged into the fork with its tests in separate commits, as the PWA work was, the contribution branch can be built by cherry-picking just the product commits onto `upstream/main` and squashing them into upstream-style commits.

## When upstream changes

```bash
git fetch upstream
git switch upstream-main && git merge --ff-only upstream/main
git switch -c chore/sync-upstream main      # then
git merge upstream-main                      # resolve, build, test
```

Open that branch as a PR into `main` and use rebase and merge or a merge commit as appropriate. Conflicts should be few, because our layer lives in separate paths. The likely places are `vite.config.ts`, `package.json` and `package-lock.json`.

Tag `main` before a large sync, for example `git tag pre-sync-YYYY-MM main`, so a bad merge is one reset away on a throwaway branch.

## When upstream accepts a contribution

He may merge or squash it, so the commits on his side can differ from ours. After he does, sync as above. If the merge conflicts in the files the contribution touched, take his version and drop ours. Do not keep both.

## Rolling back

- A feature in the fork: `git revert` its commits on `main`. Do not reset `main`; release-please reads its history and other branches build on it.
- A bad upstream sync: reset a throwaway branch to the pre-sync tag and redo it.
- To see what the fork adds beyond upstream: `git diff upstream-main..main --stat`. It should be the fork-only paths plus any merged contributions not yet accepted upstream.

## Current state

- `contrib/pwa-installable-offline` is on `origin`, built on upstream commit `27ee4e6`, with two commits: the PWA, and opening `.wcp` files launched from the OS. Both are product-only and in upstream's style.
- Checked in a clean worktree: `npm ci` and `npm run build` pass, and our 16 Vitest and 3 Playwright tests pass against it.
- Not yet sent upstream. Before opening that PR, decide whether the new dev dependency (`vite-plugin-pwa`) and the service worker on his deployed site are acceptable to him, perhaps by asking him first. Also decide whether to mention that the PR has no tests.
