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

## Roadmap (Planned Features)

### Future Ideas
- [ ] **Virtual Scrolling**: Render very large resource lists (100+ guests) with windowing for further perf gains.
- [ ] **`popup.js` Modularization**: Extract render, filters, power actions, and inline settings into separate modules to reduce file size and ease testing.
- [ ] **Backup Schedules**: View configured backup jobs and run a manual backup from the UI.
- [ ] **Bulk Power Actions**: Multi-select mode for batch start/stop/shutdown across selected guests.
- [ ] **Notifications**: Optional `chrome.notifications` for finished tasks or cluster offline events.
- [ ] **Snapshot Schedules**: Automatic snapshot policies (out of scope for v1.3.0).
- [ ] **Additional Locales**: French and Dutch after the i18n helper refactor.

## Backlog (Technical Debt & Improvements)

### Medium Priority
- [x] **E2E Testing**: Playwright tests and GitHub Actions workflow.
- [x] **ProxmoxAPI Coverage**: Unit tests for snapshots, cluster tasks, pause/resume, and connection-error categorization.
- [ ] **Refactoring**: Move i18n logic into a shared utility shared between popup and options.
- [ ] **Centralized Error UI**: Replace ad-hoc status strings with a unified toast/banner pattern.

### Feedback
If you have ideas or feature requests, please open an issue on [GitHub](https://github.com/d0dg3r/PROXMUX-Manager/issues).
