# Charm ID MacBook Pro Handoff

Last updated: 2026-06-25 09:26 JST

## Quick Links

- Thread: [Open Charm ID thread](codex://threads/019ef9f5-e584-7861-9e82-462fa700fa96)
- Device connections: [Open Codex device connections](codex://settings/connections/devices)
- GitHub repository: https://github.com/abehikaruwcf-crypto/codex-cloud-app-20260624

## Current State

- Thread ID: `019ef9f5-e584-7861-9e82-462fa700fa96`
- Thread title: `チャーム識別アプリ`
- Current host reported by Codex: `local`
- Current workspace on MacBook Air: `/Users/abehikarusub/Documents/Codex/2026-06-24/new-chat-9`
- Git remote: `https://github.com/abehikaruwcf-crypto/codex-cloud-app-20260624.git`
- Branch: `main`
- Latest confirmed commit: `94d30fc`
- Working tree on MacBook Air at pause: clean
- Thread pin: reapplied as pinned

The safest shared source of truth is GitHub `main`. If MacBook Air is shut down, continue from MacBook Pro by opening the pinned thread or cloning/pulling the repository on the Pro.

Important limitation: this currently running MBA thread cannot be forcibly moved to another host from inside itself. The reliable continuation path is to use the pinned thread plus GitHub `main` as the durable project state. Once the MBP opens this thread or a repo-backed Codex session, it should pull `origin/main` and continue from there.

## Where Work Lives

- Source code: `/Users/abehikarusub/Documents/Codex/2026-06-24/new-chat-9`
- User-facing local deliverables: `/Users/abehikarusub/Documents/Codex/2026-06-24/new-chat-9/outputs`
- App Store screenshots:
  - `outputs/app-store-screenshots-6-9`
  - `outputs/app-store-screenshots-6-5`
  - `outputs/app-store-screenshots`
- App Store docs and release packets: `docs`
- Release helper scripts: `scripts`
- Tests: `tests`

## MacBook Pro Continuation

Preferred path:

1. Open the pinned Codex thread from MacBook Pro using the thread link above.
2. Ask Codex on the Pro to continue from GitHub repository `abehikaruwcf-crypto/codex-cloud-app-20260624`.
3. Use `git pull origin main` before editing and `git push origin main` after verified changes.
4. Keep large or user-facing generated files under `outputs`.

If Codex on the Pro asks which machine should run the work, choose the MacBook Pro host. In device lists it has appeared as `abehikarunoMBP.elecom`.

If the repository is not already present on the Pro:

```bash
git clone https://github.com/abehikaruwcf-crypto/codex-cloud-app-20260624.git
cd codex-cloud-app-20260624
npm install
npm run dev:doctor
npm run test:unit
```

For App Store archive work on the Pro, install full Xcode first, then run:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
npm run appstore:xcode-packet
npm run appstore:verify
```

## Mobile -> MacBook Pro Continuation

Use the MacBook Pro as the active worker machine, then control or monitor it from mobile:

1. Keep the MacBook Pro powered, online, and signed in to Codex.
2. Open the pinned Charm ID thread on the MacBook Pro.
3. Pull the latest repo state on the Pro before asking Codex to continue:

```bash
git pull origin main
npm install
npm run dev:doctor
```

4. From mobile, open Codex and continue the same pinned thread if available, or message the MacBook Pro-side thread to continue from GitHub `main`.
5. Ask Codex to commit and push every completed checkpoint so the project survives either laptop being closed.

Mobile can steer the work, but the actual local iOS/Xcode build still depends on whichever Mac is active. If both Macs may be closed, use Codex Cloud with this GitHub repository as the source of truth.

For mobile-led work, keep this invariant: the MBP is the worker, GitHub `main` is the shared memory, and mobile only sends instructions. Ask for a commit and push after each verified checkpoint.

Suggested mobile/MBP resume prompt:

```text
Charm IDアプリ開発を続行して。GitHub repo abehikaruwcf-crypto/codex-cloud-app-20260624 の main を pull して、npm run appstore:status を確認し、ユーザー入力なしで進められるApp Store公開品質改善を実装・検証・commit・pushして。
ログイン、2FA、外部送信、App Store提出、課金、削除、秘密情報表示だけ止めて。
```

Short resume prompt from mobile:

```text
Charm IDをMBPで続行。origin/mainをpullして、手動ゲート以外で進められる改善を検証込みでcommit/pushして。
```

## If MacBook Air Shuts Down

Use GitHub as the durable handoff layer:

- Commit and push completed work from whichever Mac is active.
- Open the pinned thread on MacBook Pro and continue from `origin/main`.
- If a local Codex thread cannot resume the same checkout, create or use a Pro checkout of the GitHub repo and ask Codex to continue from that repo.
- For shareable non-code artifacts, keep the canonical copy in `outputs`; optionally copy selected files to Google Drive for human sharing, but keep source-of-truth code and release packets in GitHub.

Before closing MacBook Air:

```bash
git status --short
git log -1 --oneline
git ls-remote origin main
```

The working tree should be clean and the latest useful work should be pushed to `origin/main`. If `git status --short` shows changes, commit and push them first or record exactly why they are intentionally local-only.

Current pause check:

```text
git status --short: clean
git log -1 --oneline: 94d30fc Validate persisted local datasets on startup
```

## Approval-Light Progress Rules

Both Macs are configured by the user with:

```toml
sandbox_mode = "danger-full-access"
approval_policy = "never"
```

Within this thread, continue without asking for routine approvals for:

- Reading, editing, testing, committing, and pushing this repository.
- Running local build, test, audit, App Store readiness, and verification commands.
- Creating or updating files under the project workspace and `outputs`.

Stop and ask before:

- Login or two-factor authentication.
- External sending or submitting, including App Store submission.
- Production release, App Store upload/submit, billing, purchase, or paid service changes.
- Deleting user data or destructive git operations.
- Displaying or copying secrets, tokens, private keys, passwords, or sensitive personal data.

## Current Release Gate

Hard verification is passing, but App Review TODOs remain:

- Formal support contact
- Privacy policy contact
- App Store copyright holder
- Final App Review signoff
- Full Xcode installed and selected

Useful commands:

```bash
npm run appstore:status
npm run dev:doctor
npm run appstore:signoff-template
npm run appstore:connect-fields
npm run appstore:audit
npm run appstore:verify
```
