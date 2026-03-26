# AGENTS.md — vhendin.github.io Agent Guidelines

This file contains guidance for AI coding agents working in the `vhendin.github.io` repository.

This project is a static site hosted via GitHub Pages. It consists primarily of vanilla HTML, CSS, and JavaScript files without a complex build system or package manager.

## Project Layout and Tech Stack

- **Flat structure:** Applications and pages are standalone HTML files in the root directory (e.g., `index.html`, `raknesnurra.html`, `game-planner.html`).
- **Tech Stack:** Vanilla HTML, CSS, and JavaScript. No build tools, bundlers, or frameworks (unless explicitly included via CDN in specific files).
- **Assets:** External resources and shared assets may be located in the `resources/` folder.

## Development Commands

Since there is no build step or package manager, development is straightforward:

- **Local Preview:** You can open the `.html` files directly in a web browser.
- **Local Server:** If a file uses `fetch()` or modules that require a server environment, start a simple local web server from the repository root:
  - Node.js: `npx http-serve -p 3002`

## Branching Model and Deployment

This repository uses a simplified GitHub Flow model.

```
feature/* ──PR or push──▶ main ──auto-deploy──▶ GitHub Pages
```

### Branches

- **`main`** (default branch) — production branch. Pushes or merges to this branch trigger automatic deployment to GitHub Pages.
- **Feature branches** — Branch from `main` for new work. 
- Branch naming follows conventional commit prefixes: `feat/<name>`, `fix/<name>`, `refactor/<name>`, `chore/<name>`.

### Deployment

Deployments to production (vhendin.github.io) happen automatically when commits are merged or pushed to the `main` branch via GitHub Pages.

## Coding Standards

### 1) Make minimal, scoped changes

- Prefer the smallest diff that solves the task.
- Do not reformat unrelated files or lines.
- Avoid drive-by refactors unless explicitly requested.

### 2) Vanilla Web Standards

- Write clean, modern, and semantic HTML5.
- Use standard CSS3 (or modern features where supported) without preprocessors unless specified.
- Use vanilla JavaScript (ES6+). Avoid introducing external dependencies or libraries (like jQuery) unless requested or already present.

### 3) Secrets and Configuration

- **This is a public, client-side repository.** Do NOT hardcode secrets, API keys, passwords, or personal tokens anywhere in the codebase. Everything committed here is publicly visible and accessible in the browser.

### 4) Commenting and documentation

- Add comments to explain complex logic, especially in JavaScript.
- Comments should describe the current system state only. Avoid "legacy talk".
- If you introduce a new standalone HTML application, consider adding a brief description of its purpose at the top of the file.

### 5) Commits and version control

**Only commit your changes if explicitly asked to.**

#### Commit scope and granularity

- **One logical unit of work per commit.** Each commit should be reviewable and understandable in isolation.
- **Touch as few files as possible per commit.** If a change spans multiple independent HTML files, split them by file unless they share a direct dependency.
- **Never batch unrelated changes** into a single commit.

#### Commit messages

- Use conventional commits style (e.g., `feat:`, `fix:`, `docs:`, `refactor:`) for clarity.
- Include a brief description of *what* changed and *why* — write for the reviewer, not yourself.

## GitHub Interactions

### Pull Requests

- **Always ask for permission before creating a PR.** Prepare the branch and commits, then confirm with the user before opening the PR.
- **Never merge PRs.** Always defer merging to a human reviewer.
- **Always target the repository's `main` branch** when creating a PR.

### AI Disclosure

- **Sign all GitHub comments, review comments, PR and Issue descriptions** to make it clear they were written by an AI assistant.
- Append the following signature to every comment and description:

  `— 🤖 AI Assistant`

## Workflow

- **Note down all major features into a planning file** It should be markdown formatted.
- It should contain a todo list of well scoped tasks.
- When making progress, always check things of from the todo list.
- Always create a documentation file for a new project, and keep it up to date as the project progresses.
