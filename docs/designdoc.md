# Nightshift MVP Design Document

**Product:** Nightshift – Vibe Coding Companion Web App  
**Status:** MVP Spec (Draft)  
**Version:** 0.4 (expanded with backend details & user flows)  
**Owner:** Product + Engineering (you)  
**Last Updated:** 2025-09-23

---

## 1. Positioning

Nightshift is a **web-based companion app for programmers** designed to keep them in flow while coding. Unlike heavy PM suites or rigid AI tools, Nightshift provides a frictionless environment for drafting design docs, structuring roadmaps, optimizing prompts, and generating agent-ready assets—all without mandatory integrations.

Nightshift’s differentiator is its **context-aware pipeline**: once the user creates a project, all tools reference the living design document to ensure consistency across planning, roadmapping, and AI prompt generation.

**Stack (MVP):**

- **Frontend:** TanStack Starter (React + Vite), TanStack Router, TanStack Query, Shadcn + Tailwind
- **Backend:** Express/Fastify, Drizzle ORM, Neon Postgres
- **Auth:** Clerk
- **Billing:** Stripe
- **AI:** OpenAI API (with option to expand to OpenRouter)

---

## 2. Problem & Goals

### Problem

Programmers waste time bouncing between tools (Notion, Jira, GitHub, AI assistants). Existing options are **too heavy, fragmented, or require integrations**. They need a lightweight **sidekick** that supports creative planning, AI orchestration, and documentation without disrupting their vibe.

### MVP Goals

- Project-based workflow with **onboarding context capture**.
- **Design Document Assistant**: split-screen chat + markdown editor for structured planning.
- **Roadmap Generator**: milestone → feature → prompt decomposition.
- **Prompt Optimizer**: generate tailored prompts with MPC server + agent context.
- **Agent Optimizer**: build cursor rules and agent.md interactively with real-time markdown.
- Subscription-based monetization with Clerk + Stripe.
- Single-user experience, no external tool integrations.

### Non-Goals (MVP)

- Multi-user real-time editing.
- Third-party PM tool integrations (Jira, Notion, GitHub).
- Advanced analytics, dashboards, or graph-based queries.

---

## 3. Core Features

### 3.1 Project Onboarding

- Input: **App goal, intended users, tech stack, services**.
- Result: Structured **project context object** stored in Neon.
- Context feeds into **all downstream tools**.

---

### 3.2 Design Document Assistant

- UI: Split screen – **chat (left)**, **markdown editor (right)**.
- Flow:
  1. Agent asks structured onboarding questions.
  2. Responses + project context → **draft design doc**.
  3. User iterates live with assistant.
- Output: **Living design document** (markdown).
- Stored in Neon → primary reference for Roadmap & Agent Optimizer.

---

### 3.3 Roadmap Generator

- Input: Design Document.
- Output: **Hierarchical roadmap** (visual UI):
  - **Milestones** → **Features** → **Prompts**.
- Features can be expanded into agent-ready prompts via **Prompt Optimizer**.
- Persisted roadmap versions stored in Neon.

---

### 3.4 Prompt Optimizer

- Inputs:
  - Project context (from onboarding + design doc).
  - Agent target (Codex, Cursor, Claude, etc.).
  - Available MPC servers.
- Flow: Chat wizard to refine intent → generates **highly optimized prompt**.
- Standalone tool or invoked inside Roadmap Generator / Agent Optimizer.
- Output stored as versioned prompt per feature.

---

### 3.5 Agent Optimizer

- UI: Split screen – **chat (left)**, **markdown editor (right)**.
- Flow:
  1. User chooses **cursor rules** or **agent.md**.
  2. Agent references design doc + project context.
  3. Follows up with leading questions (coding style, frameworks, MPC servers).
  4. File builds in real-time in editor.
- Output: Persisted file (markdown + downloadable).

---

## 4. User Flows

### 4.1 Onboarding

1. User signs up via **Clerk**.
2. Creates a **New Project**.
3. Completes structured form (goal, users, stack).
4. Lands in **Project Dashboard** with recommended “Start Design Doc.”

---

### 4.2 Design Doc Creation

1. Enters **Design Document Assistant**.
2. Completes guided chat.
3. Edits live document in markdown.
4. Document saved automatically in Neon.

---

### 4.3 Roadmap Workflow

1. From project, open **Roadmap Generator**.
2. Agent parses design doc → draft roadmap.
3. User edits milestones & features.
4. Click on feature → **Generate prompt** (via Prompt Optimizer).

---

### 4.4 Agent Rules Workflow

1. From project, open **Agent Optimizer**.
2. Choose Cursor Rules / Agent.md.
3. Chat collects additional context.
4. Markdown file builds live.
5. Save/export to project repository.

---

## 5. Services

- **Clerk** → Authentication (sign-up, sign-in, session mgmt).
- **Stripe** → Subscription billing, entitlement checks, webhooks.
- **Neon Postgres** → Project docs, roadmaps, prompts, agents, users.
- **OpenAI API** → LLM generation (multi-model routing per task).

---

## 6. High-Level Architecture

### 6.1 Frontend

- **TanStack Starter** → React + Vite boilerplate.
- **TanStack Router** → File-based routing.
- **TanStack Query** → Server state mgmt + caching.
- **Clerk React SDK** → Auth integration.
- **UI** → Tailwind + Shadcn components.

### 6.2 Backend

- **Framework** → Express/Fastify (TanStack compatible).
- **Database** → Neon Postgres (managed, serverless).
- **ORM** → Drizzle (schema migrations + queries).
- **Stripe** → Subscriptions + entitlements.
- **Clerk Backend SDK** → Auth middleware (JWT).
- **OpenAI API** → Document generation, roadmap decomposition, prompt optimization.

---

## 7. Data Model (Draft)

**Users**

- id, email, clerk_id, subscription_tier

**Projects**

- id, user_id (FK), name, goal, user_base, tech_stack, created_at

**DesignDocs**

- id, project_id (FK), content (markdown), version

**Roadmaps**

- id, project_id (FK), structure (JSON milestones → features → prompts), version

**Prompts**

- id, feature_id (FK), agent_target, mpc_servers, content

**Agents**

- id, project_id (FK), type (cursor_rules / agent.md), content

---

## 8. Subscription Model

- **Free Tier** → Limited projects + usage.
- **Standard ($24/mo)** → Unlimited projects, core tools.
- **Business ($68/mo)** → Advanced prompt optimization, multiple agent profiles, priority API quota.

Stripe handles billing + entitlements; Clerk handles tier-based access gating.

---

## 9. Next Steps

1. Finalize MVP data model & Neon schema.
2. Build Project Onboarding flow.
3. Implement Design Document Assistant (first core feature).
4. Layer in Roadmap Generator + Prompt Optimizer.
5. Add Agent Optimizer last.
6. Stripe + Clerk integration for gated access.

---

## 10. Future Enhancements (Post-MVP)

- Multi-user collaboration & shared projects.
- GitHub/Jira/Notion integrations.
- Graph-based analytics + usage dashboards.
- Expanded AI routing (Claude, Gemini, Anthropic, etc. via OpenRouter).
- Team-level subscription management.

---
