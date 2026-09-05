---
name: Dependency installation
description: Non-obvious npm installation constraint for the imported Deriv trading-bot project
---

The imported project currently needs npm legacy peer resolution to install its existing dependency tree successfully; the SmartCharts dependency can resolve to a version whose Quill UI peer range is newer than the project's pinned Quill UI version.

**Why:** A normal dependency install fails before type-checking or building, even though the existing source compiles and the production build succeeds with the imported versions.

**How to apply:** Preserve the existing dependency declarations unless intentionally upgrading the Deriv packages. For verification, use legacy peer resolution rather than changing package versions solely to satisfy npm's peer resolver.