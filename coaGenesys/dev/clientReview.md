# Client Review: Genesys Call Verification Improvements

**Last updated (UTC):** 2026-02-25 12:18

## Executive Summary

We reviewed the current Genesys-to-Salesforce call “screen pop” and verification workflow and identified why caller verification details are sometimes not saved, and why caller identity (name/phone) is often not captured at all.

This plan focuses on:

- Ensuring verification records are saved reliably every time
- Making caller identity consistently capturable for both Member and Provider calls
- Reducing production risk by separating urgent call-flow fixes from broader data-management changes
- Improving resiliency and maintainability with targeted hardening 

## What’s Changing (and Why)

### 1) Save reliability: prevent intermittent loss of verification records

**Change:** Update the verification forms so they **save first**, and only then close/navigate. If saving fails, the form stays open with a clear message and the CSR can retry.

**Why:** Today, the form closes immediately and the save happens “in the background.” That sequence can cause intermittent failures where the save does not complete, leading to missing verification records.

**Business impact:**

- Increases confidence that required verification documentation is consistently created
- Reduces manual backfill and compliance risk from missing verification entries

### 2) Caller identity capture: make Caller Name and Caller Phone consistently available

**Change:** Make **Caller Name always visible and required** for both Member and Provider verification.

**Change:** Make **Caller Phone always visible but optional**, and auto-fill it when the inbound phone number is already known.

**Why:** In the current workflow, the caller name/phone fields are hidden for the most common call scenarios, which makes it impossible to capture them even when the CSR knows the information.

**Business impact:**

- Improves reporting accuracy and call documentation quality
- Reduces downstream questions about “who called” for audits or follow-up

### 3) Provider verification stability: remove fragile timing dependencies

**Change:** Standardize how Provider verification receives its data so it is passed consistently (not dependent on timing).

**Why:** The current Provider path uses a timing-dependent approach that can lead to missing data in the verification form.

**Business impact:**

- Reduces edge-case failures in Provider verification
- Improves consistency between Member and Provider experiences

### 4) Provider Case Origin: require selection before verification completes

**Change:** Require “Case Origin” selection for Provider verification, matching the Member workflow.

**Why:** Case Origin supports consistent categorization and reporting. Today, it can be unintentionally skipped for Provider calls.

**Business impact:**

- Improves reporting completeness and reduces data gaps

### 5) Auto-fill caller phone (ANI) end-to-end

**Change:** Pass the inbound caller phone number from the telephony payload through the existing layers so it can be auto-filled in the verification form.

**Why:** The system already receives the inbound caller number, but it is not currently forwarded to the verification UI.

**Business impact:**

- Reduces CSR effort and increases consistency
- Improves data quality without adding call handling time

### 6) Resiliency hardening (defensive improvements)

**Change:** Add defensive error handling in the screen pop entry point and protect against missing configuration.

**Why:** These improvements reduce the chance that unexpected payloads or configuration drift causes failures.

**Business impact:**

- Reduces future outage risk
- Improves operational stability

### 6A) Additional best-practice enhancements (quality, audit-readiness, and maintainability)

**Change:** Add a small set of targeted improvements that do not change the business workflow, but reduce future risk and improve data quality.

**Why:** These items address “paper cuts” and edge cases identified during review (for example: a field that appears on-screen but doesn’t reliably save, or pages that can error if a link is malformed).

**Included enhancements (brief):**

- **Provider caller details reliably captured**: Ensure all provider caller details selected/entered on the verification form are actually saved.
- **Verification page robustness**: Improve reliability when inputs are unexpected (for example: malformed links or missing parameters) so the CSR experience fails gracefully.
- **Safer page-to-component data handling**: Add defensive escaping to prevent rare display/parsing issues when data contains special characters.
- **Improved monitoring for background cleanup**: Strengthen logging/visibility when automated provider cleanup actions fail.
- **Performance guardrails**: Add sensible limits/guardrails to prevent unusual data conditions from impacting performance.
- **Reduce long-term maintenance risk**: Remove or clearly deprecate legacy/unused components to prevent future configuration confusion.

**Business impact:**

- Improves reliability and audit-readiness without changing how CSRs handle calls
- Lowers long-term operational risk and support burden

### 7) Separate deployment for non-call-flow data management fixes

**Change:** Fixes to the provider deduplication trigger will be deployed separately.

**Why:** That trigger affects provider data management broadly. Separating deployments reduces risk and allows focused testing.

**Business impact:**

- Faster delivery of urgent call-flow fixes
- Lower change risk to provider data operations

## Methodology (Brief)

We used a structured review approach designed to minimize implementation risk:

- **End-to-end trace:** Followed the full call flow from Genesys payload → Salesforce entry point → verification UI → record creation.
- **Source validation:** Confirmed key findings by checking actual implementation files, not assumptions.
- **Root-cause focus:** Prioritized changes that address the underlying causes of missing data.
- **Decision documentation:** Captured explicit design decisions (behavior, security posture, deployment strategy) to prevent drift and rework.

## Decision Register (Today)

| ID | Decision | Summary | Impact |
|---|---|---|---|
| D1 | Save failure behavior | On save failure, the verification form stays open with an error message; CSR can retry; no navigation until success | Improves reliability and auditability; slightly different UX only in rare failure cases |
| D2 | Caller identity capture | Caller Name is required on both paths; Caller Phone is optional and auto-filled when available | Improves data completeness; minor additional required entry (name) for CSRs |
| D3 | ANI source for auto-fill | Use the top-level inbound phone value used for matching; store as raw digits (no extra formatting) | Ensures consistency between “what we searched on” and “what we record” |
| D4 | Security posture for verification pages | Explicit system-mode access for this workflow (break-glass); no field-level security enforcement inside the verification workflow | Enables CSRs to verify callers reliably; requires access to verification pages be restricted via permission sets/call center setup |
| D5 | Interaction record enrichment | Defer populating the managed “Interaction” record until after core fixes, pending data model review | Keeps Phase 1 focused; avoids incorrect assumptions about managed object fields |
| D6 | Provider dedup trigger fix | Deploy separately from the call-flow fixes | Reduces deployment risk; allows independent testing |
| D7 | Provider Case Origin requirement | Case Origin will be required for Provider verification to match Member behavior | Improves reporting consistency; small added validation step |
| D8 | Phone normalization hardening | Defer phone normalization changes unless production evidence shows format mismatches | Avoids unintended match behavior changes; keeps current stable behavior |

## Implementation & Rollout (High-Level)

- **Phase 1 (Urgent call-flow fixes):**
  - Save-before-close with retry
  - Caller name/phone visibility and validation
  - Provider data passing stability
  - Provider Case Origin requirement
  - ANI pass-through for phone auto-fill

- **Phase 2 (Hardening):**
  - Defensive error handling and configuration guards
  - Additional best-practice enhancements (data capture reliability, graceful failure behavior, monitoring, and performance guardrails)

- **Separate deployment:**
  - Provider dedup trigger RecordType portability fix

## Success Criteria (Leadership View)

- Verification records are created consistently (no intermittent missing logs)
- Caller name is captured for both Member and Provider calls
- Caller phone is auto-filled when known, reducing manual effort
- Provider workflow behavior matches Member workflow where appropriate (consistency)
- Changes are deployed with reduced risk via phased rollout
