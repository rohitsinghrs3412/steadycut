# Execution Plan - SteadyCut Codebase Analysis

This document outlines the step-by-step execution plan for the SteadyCut Codebase Analysis.

## Milestones Summary

### Milestone 1: Exploration Phase
- **Objective**: Explore the frontend architecture, backend Convex architecture, AI flows, and PWA/push notification configurations.
- **Sub-agents**: 
  - Frontend Explorer (`teamwork_preview_explorer`): Focus on Next.js 16.2.6 App Router structure, client/server component boundaries, and styling.
  - Backend Explorer (`teamwork_preview_explorer`): Focus on Convex backend schemas, queries, mutations, actions, and auth.
  - AI & PWA Explorer (`teamwork_preview_explorer`): Focus on Gemini meal analysis and daily coaching, prompt and fallback modules, PWA configuration, and push notifications.
- **Deliverables**: Detailed exploration reports from each explorer in their respective directories.

### Milestone 2: Refactoring and Code Quality Audit
- **Objective**: Conduct a comprehensive audit of all source files (`src/` and `convex/`) to identify files exceeding the limits defined in ARCHITECTURE.md:
  - Feature TSX files exceeding 400 lines.
  - Pure domain modules exceeding 300 lines.
  - Route page components (`page.tsx`) exceeding 40 lines.
  - Duplicate code or logic patterns.
- **Verification**: Run lines-limit auditing scripts or analysis to collect exact line counts.

### Milestone 3: Review & Verification
- **Objective**: Spawn a reviewer subagent to check the quality, completeness, and depth of the gathered analysis before synthesizing.
- **Sub-agents**: `teamwork_preview_reviewer`

### Milestone 4: Synthesis & Final Report
- **Objective**: Synthesize the findings and the audit results into a cohesive markdown document at `c:\Users\Rohit Singh\Desktop\testing\CODEBASE_ANALYSIS.md`.
- **Verification**: Ensure the final report has the requested sections: "Architecture Overview", "Module Walkthroughs", "Refactoring and Code Quality Audit", and "Recommendations", and meets all acceptance criteria.
