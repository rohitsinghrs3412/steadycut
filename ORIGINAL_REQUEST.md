# Original User Request

## Initial Request — 2026-06-13T20:58:51+05:30

An in-depth analysis of the SteadyCut codebase using a multi-agent system. The team must orchestrate the process using sub-agents to explore the codebase and coordinate their findings through an orchestrator and a reviewer agent.

Working directory: c:\Users\Rohit Singh\Desktop\testing
Integrity mode: development

## Requirements

### R1. Codebase Exploration and Orchestration
The team must orchestrate the codebase exploration by:
- Launching sub-agents to explore specific parts of the codebase (e.g., frontend routes, Convex backend, AI flows, configuration).
- Coordinating their findings through a central orchestrator agent.
- Having a reviewer agent check the quality and depth of the gathered analysis before synthesizing the final output.

### R2. Architectural Analysis
The final analysis must cover:
- Core frontend architecture (Next.js 16.2.6 App Router structure, client/server component boundaries, styling).
- Convex backend architecture (schemas, queries, mutations, actions, and auth integration).
- AI flows (Gemini meal analysis and daily coaching, prompt and fallback modules).
- PWA and push notification implementation.

### R3. Refactoring Audit
The team must inspect all source files (`src/` and `convex/`) and identify files that exceed the guidelines specified in ARCHITECTURE.md:
- Feature TSX files exceeding 400 lines.
- Pure domain modules exceeding 300 lines.
- Route page components (`page.tsx`) exceeding 40 lines.
- Duplicate code or logic patterns that can be consolidated.

### R4. Report Generation
The final output must be saved to CODEBASE_ANALYSIS.md in the project root directory.

## Acceptance Criteria

### Verification Criteria
- [ ] CODEBASE_ANALYSIS.md exists in the project root.
- [ ] The report contains clear sections: "Architecture Overview", "Module Walkthroughs", "Refactoring and Code Quality Audit", and "Recommendations".
- [ ] The "Refactoring and Code Quality Audit" lists specific files that exceed the line-count limits with their actual line counts.
- [ ] The report is written in clean, well-formatted markdown.
