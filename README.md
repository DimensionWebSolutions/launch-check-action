# Launchpad launch check

A GitHub Action that checks an app built with Lovable, Bolt, v0, Replit or Cursor for what breaks at launch, on every pull request:

- keys and secrets committed to the code, or sent to the browser;
- database tables anyone can read or write (Supabase without Row Level Security, open Firebase rules);
- what breaks the build on a server: imports with the wrong capital letters, packages that aren't installed, a single-page app with no rewrites;
- with a domain, the email records that keep its mail out of spam.

It keeps one comment on the pull request up to date with what to fix, each finding linked to a step-by-step fix, and a request you can paste into the AI tool that built the app to fix them all. The lines it found are marked in the diff, and the report is in the job summary.

The check runs on the workflow's own runner. Your code isn't uploaded anywhere: the only requests are to GitHub's API, for the comment, and with a domain, to look up its DNS records.

## Use it

`.github/workflows/launch-check.yml`:

```yaml
name: Launch check
on: pull_request

permissions:
  contents: read
  pull-requests: write # to comment; leave it out and the report is in the job summary only

jobs:
  launch-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: DimensionWebSolutions/launch-check-action@v1
```

The job fails when there's something to fix before launch. To only report, add `with: { fail-on: never }`.

## Inputs

| Input | Default | What it does |
| --- | --- | --- |
| `path` | `.` | The app's folder in the repository. |
| `domain` | | The app's domain, to check its email records too. |
| `comment` | `true` | Comment the report on pull requests. `false` keeps it to the job summary. |
| `fail-on` | `fail` | `fail`: the job fails for anything to fix before launch. `warn`: for anything to fix at all. `never`: it only reports. |
| `github-token` | the workflow's token | The token that comments. |

## Outputs

`score` (out of 100), `fails` (to fix before launch) and `warns` (worth fixing), for later steps.

## Pull requests from forks

GitHub gives a pull request from a fork a token that can't write, so there's no comment: the report is in the job summary, and the job still passes or fails.

## The same check elsewhere

- On the website, for any public repository or a .zip of the code: [launchpad.axonscape.com/check](https://launchpad.axonscape.com/check)
- On your computer: `npx @axonscape/launchpad launch-check`
- From an AI agent, through Launchpad's MCP server: [the agents guide](https://launchpad.axonscape.com/docs/agents)

[Launchpad](https://launchpad.axonscape.com) deploys the app afterwards, on accounts you own. Made by Axonscape. MIT licence.
