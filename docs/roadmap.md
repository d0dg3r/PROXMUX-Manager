# PROXMUX Manager - Roadmap & Backlog

This document outlines the planned features, improvements, and technical debt for PROXMUX Manager.

## Shipped

### v1.2.0: Power Management
- [x] **VM/LXC Controls**: Buttons for Start, Stop, Shutdown, Reboot, Pause, and Resume directly in the resource list.
- [x] **Confirmation Dialogs**: Two-step in-extension confirmation for destructive actions, suppressible via global toggle.
- [x] **Status Polling**: Real-time status updates after a power action is triggered.

### v1.3.0: Cluster Dashboard, Snapshots, and Polish
- [x] **Resource Overview**: Aggregated CPU, memory, and storage tiles plus node and guest health summary at the top of the resource list.
- [x] **Group by Node**: Optional grouping of resources by node with sticky group headers and per-node guest counts.
- [x] **Recent Cluster Tasks**: Compact panel below the dashboard fed from `/cluster/tasks`.
- [x] **Auto-Refresh**: Configurable interval per active tab (`Off`, `15s`, `30s`, `60s`, `2m`, `5m`).
- [x] **Snapshots**: List, create, delete, and roll back QEMU/LXC snapshots from the resource detail card with confirmations and EN/DE strings.
- [x] **TLS-Aware Connection Errors**: `categorizeConnectionError` plus `Open Proxmox URL` action for self-signed certificates.
- [x] **Lazy + Throttled Detail Fetch**: Per-resource detail lookups run only on expand, capped at four concurrent requests.
- [x] **API Layer**: `ProxmoxAPI` extended with snapshot endpoints, cluster tasks, pause/resume/suspend, and connection-error categorization.

## Next Feature Packages

These are intentionally separate from the audit-fix work. Do not mix them into a bugfix PR.

### Package A — Reliability and scale
- [ ] **Virtual Scrolling**: Render very large resource lists (100+ guests) with windowing.
- [ ] **`popup.js` Modularization**: Extract render, filters, power actions, consoles, and inline settings into modules so the 4.8k-line popup file is reviewable and testable.

### Package B — Day-2 operations
- [ ] **Backup Jobs**: View configured Proxmox backup jobs and trigger a manual backup from the UI.
- [ ] **Bulk Power Actions**: Multi-select mode for batch start/stop/shutdown across selected guests.
- [ ] **Notifications**: Optional `chrome.notifications` for finished tasks or cluster-offline events.

### Package C — Policies and i18n
- [ ] **Snapshot Schedules**: Automatic snapshot policies (out of scope for v1.3.x).
- [ ] **Shared i18n helper**: Centralize `chrome.i18n.getMessage` fallbacks used by popup and options.
- [ ] **Additional Locales**: French and Dutch after the i18n helper refactor.

## Backlog (Technical Debt & Improvements)

### Medium Priority
- [x] **E2E Testing**: Playwright tests and GitHub Actions workflow.
- [x] **ProxmoxAPI Coverage**: Unit tests for snapshots, cluster tasks, pause/resume, failover, session checks, and connection-error categorization.
- [x] **Release Gates**: Version and locale parity checks plus a slimmer release ZIP.
- [ ] **Centralized Error UI**: Replace ad-hoc status strings with a unified toast/banner pattern.
- [ ] **Shared Settings Module**: Deduplicate cluster/SSH/backup helpers between `popup.js` and `options.js`.

Recommended order: A first (the popup split unlocks safer work on B and C), then B, then C.

### Feedback
If you have ideas or feature requests, please open an issue on [GitHub](https://github.com/d0dg3r/PROXMUX-Manager/issues).
