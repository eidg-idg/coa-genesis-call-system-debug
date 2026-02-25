<!-- PLAN QUALITY: All plan quality concerns have been resolved as of 2026-02-25T12:12:00Z -->
# Genesys Call System - Executive Summary & Issue Report

> For the full technical breakdown including line-by-line analysis, execution flow diagrams, and complete asset inventory, see [genesysCodeAnalysis.md](genesysCodeAnalysis.md).

---

## System Overview

When a phone call arrives through Genesys Cloud, the system performs the following steps:

1. **Genesys delivers call data** (caller phone number, IVR-collected info like last 4 SSN or provider NPI) to Salesforce via a managed package integration point.
2. **An Apex class parses the call data** and searches Salesforce for a matching Member (Account) or Provider (HealthcareProvider) record.
3. **A verification page displays** the matched record(s) so the CSR can confirm the caller's identity by checking off data points (name, DOB, SSN, etc.).
4. **A verification record is saved** capturing who called, what was verified, and the call context.
5. **The CSR is navigated** to the member or provider record to handle the inquiry.

The system has two parallel paths — one for Members and one for Providers — each with its own set of pages, components, and verification logic.

---

## Known Issues

| Problem | Type | Status |
|---|---|---|
| **Verification data not logging** | Code Bug | Active — root causes identified below |
| **Screen pop failure in sandbox** | Configuration Issue | Being troubleshot at the Genesys configuration level — not a code defect |

### Clarification: Screen Pop

The screen pop works consistently in production. The intermittent screen pop failure observed in the sandbox environment is caused by a **Genesys Cloud configuration issue** specific to the sandbox integration, not by a defect in the Apex or LWC code. This is being addressed directly at the configuration level to enable live-call debugging in the sandbox.

The code analysis below identifies best practices improvements to the screen pop Apex class (try-catch, RecordType guard) that would improve resilience, but these are **not fixes for a production bug**. They are listed in Phase 2 of the remediation plan as defensive improvements.

---

## Root Causes: Verification Data Not Logging

### 1. Close event unmounts the verification form before the async save settles

This is the most significant bug. When the CSR clicks "Verify," the system does two things in sequence:
1. Dispatches a `close` event to the parent component (which unmounts the modal)
2. Initiates an asynchronous save of the verification record

LWC custom events are synchronous, so the parent immediately processes the close and removes the modal from the DOM. The `createRecord` API call is likely initiated before the component is removed, but the component is unmounted before the async save completes/settles, making the Promise resolution handlers (`.then`/`.catch`) unreliable on a destroyed component. This makes save and navigation intermittently fail, which is consistent with the observed behavior of verification records sometimes not being created.

**Affected files:** `memberVerificationModal.js` lines 208-213, `providerVerificationModal.js` lines 138-143

### 2. The caller name field is not visible for most call types

For **Member calls** (the majority of call volume), the caller name input field only appears when the CSR selects "Non-Member" and then chooses a Representative Type. For standard member calls, there is no field on the form to enter the caller's name. It is architecturally impossible to capture it.

For **Provider calls**, the caller name field only appears when the CSR checks a box labeled "Are you calling on behalf of a Provider?" For direct provider calls, the field is hidden.

The same visibility restriction applies to the **caller phone number** field on both paths.

**Affected files:** `memberVerificationModal.html` line 94 (gated by `showAdditionalFields`), `providerVerificationModal.html` line 73 (gated by `isCallingOnBehalf`)

### 3. Provider verification data passed through fragile mechanism

The provider verification modal receives its data (interaction ID, provider ID, provider details) through a timing-dependent mechanism (`setTimeout` with zero delay). This exists because `selectedProvider()` in `verifyProvider.js` is defined as a method instead of a getter, so the template binding `healthcare-provider={selectedProvider}` passes `undefined`. The `setTimeout` workaround imperatively sets the data after the modal renders, but this pattern is fragile — if the component hasn't rendered yet, the data may never arrive.

**Affected files:** `verifyProvider.js` lines 66-74 and line 84

---

## Decisions & Rationale

The following decisions were made during review to guide the remediation plan. Each decision is documented with its rationale.

### Decision 1: Save failure behavior — Stay in modal with retry

**Context:** After fixing the save-before-close race condition, save failures should be rare (network issues, validation rules, governor limits). The question is what happens in that edge case.

**Decision:** On save failure, the modal stays open with an error message and the CSR can retry. No navigation happens until the record is successfully saved.

**Rationale:** The primary goal is to ensure every verification record is created. Navigating the CSR away on failure — even with a warning — means the record is lost and must be manually documented. Keeping the modal open with retry eliminates that risk entirely. Since save failures will be rare after the race condition fix, the retry experience will almost never be triggered.

### Decision 2: Caller identity capture — Name required, Phone optional with ANI auto-fill

**Context:** Moving caller name/phone fields to be always visible is necessary but insufficient. We also need to decide whether they're required and whether the phone can be pre-populated.

**Decision:**
- **Caller Name**: Required on both paths. The Verify button is blocked until a name is entered. Validation: non-empty after trimming whitespace (no format or minimum length requirement).
- **Caller Phone**: Optional on both paths. Auto-populated from the Genesys ANI (inbound phone number) when available. CSR can edit if needed.
- **ANI source**: Use `searchValue` from the top-level Genesys payload (already normalized by stripping `+1` country code). This is the same value used for record matching, so the auto-filled phone is consistent with what the system searched on. Do not use `sf_ANI` from the nested IVR data.
- **Phone storage format**: Raw digits as received from the Apex normalization. No additional formatting applied in the LWC.

**Rationale:** The CSR always knows who they're speaking with, so Caller Name should always be captured. Caller Phone is less critical because the ANI is already known to the system — auto-filling it from the Genesys payload reduces manual entry while still allowing override. Making phone optional avoids blocking verification when ANI isn't available (e.g., outbound calls, transfers). Using `searchValue` as the ANI source ensures the auto-filled phone matches the value the system used for record lookup.

**Implementation note:** Auto-filling from ANI requires a new data pipeline. The ANI is available in `GenesysCTIExtensionClassV2` but is not currently passed downstream to the VF pages or LWC components. Step 1.7 in the remediation plan adds this pipeline.

### Decision 3: Security model — Explicit `without sharing`, no FLS checks

**Context:** The VF page controllers currently run in implicit system mode (no sharing keyword declared). The feedback review flagged this as needing an explicit decision.

**Decision:**
- **Sharing**: Keep system mode, but make it explicit by changing to `without sharing`. This documents the intentional decision.
- **FLS**: No FLS enforcement. All CSRs in this workflow need to see SSN/DOB/TIN fields to perform verification.

**Rationale:** This is a call center "break glass" workflow. CSRs handling inbound calls need to see all matched records regardless of record ownership or sharing rules. If `with sharing` were enforced and a matched record wasn't shared with the CSR, the caller would appear unverifiable — defeating the purpose of the verification flow. Making the sharing mode explicit (`without sharing` instead of implicit) prevents future developers from mistakenly adding `with sharing`.

**Access controls (compensating):** This is not "security by obscurity." Access to the verification workflow is controlled by two mechanisms: (1) **Genesys call center routing** determines which inbound calls trigger a screen pop and which agents receive them; (2) **Salesforce permission set assignments** control which users can access the VF verification pages. Only CSRs assigned the appropriate Call Center configuration and permission set reach the verification UI. The `without sharing` / no-FLS posture is scoped to this workflow — it does not affect other access patterns in the org.

### Decision 4: Interaction record population — Deferred

**Context:** Both `verifyMember.js` and `verifyProvider.js` create `UST_EPLUS__Interaction__c` records with zero fields populated. This is a data completeness gap.

**Decision:** Defer to a future phase after the core bug fixes are deployed and verified.

**Rationale:** `UST_EPLUS__Interaction__c` is a managed package object. Determining which fields to populate requires inspecting the object schema (`sf sobject describe UST_EPLUS__Interaction__c`) and coordinating with the managed package data model owner. The empty Interaction record is a data completeness gap, not a data loss bug — it doesn't prevent verification records from being created. Fixing the core bugs (data loss, caller identity capture) takes priority.

### Decision 5: HealthcareProviderTrigger — Separate deployment

**Context:** The trigger's hardcoded RecordType IDs silently fail in sandboxes. This needs fixing, but the trigger affects provider data management (deduplication), not the call verification flow.

**Decision:** Deploy the trigger fix separately from the Phase 1 call-flow bug fixes.

**Rationale:** Mixing call-flow fixes with data management fixes increases deployment risk. The trigger fix has broad data impact (it changes which provider records get deduplicated). Deploying it independently allows it to be tested and validated in isolation. The call-flow fixes are the urgent priority; the trigger fix enables sandbox testing but doesn't block the core bug resolution.

### Decision 6: Provider Case Origin — Required (match member behavior)

**Context:** The member modal requires Case Origin before showing the verification section. The provider modal does not — the CSR can click Verify with no Case Origin selected.

**Decision:** Make Case Origin required on the provider path, matching the member modal behavior.

**Rationale:** Consistency between the two paths reduces CSR confusion and ensures data completeness. Case Origin is a key field for reporting and call categorization. If it's important enough to require on the member path, it should be required on the provider path as well.

### Decision 7: Phone normalization — Deferred

**Context:** The screen pop Apex class only strips the `+1` country code prefix. If phone formats diverge between Genesys and Salesforce, matching could break.

**Decision:** Defer. No changes to phone normalization.

**Rationale:** The screen pop works consistently in production, meaning current phone formats are compatible. Furthermore, implementing digits-only normalization on the inbound side alone is incomplete — if `Account.Phone` stores formatted values (e.g., `(303) 555-1234`), SOQL exact-match queries would still fail even with a normalized search value. The full fix requires digits-only formula fields on Account and HealthcareProvider to query against, which is a broader data model change. This should only be pursued if format mismatches are observed.

---

## File-by-File Problem Summary

### Apex Classes

| File | Role | Key Problems |
|---|---|---|
| **GenesysCTIExtensionClassV2.cls** | Handles every inbound call | No exception handling (resilience risk); unprotected RecordType query on line 117; ANI not passed downstream to LWC components |
| **GenesysCTIExtensionClass.cls** | Legacy version (inactive) | Same best practices issues as V2; dead code |
| **MyScreenPopExtension5/6/7.cls** | Older legacy versions (inactive) | Dead code with incompatible URL parameter formats |
| **GC_Account_PageController.cls** | Loads member data for verification page | No error handling; implicit sharing mode (intentionally system-mode — will make explicit with `without sharing`) |
| **GC_HealthcareProvider_PageController.cls** | Loads provider data for verification page | Same issues as Account controller |
| **DelayedDeleteHandler.cls** | Deletes duplicate provider records | Silently swallows errors — failed deletions produce no alerts |

### Lightning Web Components

| Component | Role | Key Problems |
|---|---|---|
| **verifyMember** | Displays matched members, creates call interaction record | Interaction record created with zero fields populated (deferred); data passing to modal works correctly (declarative) |
| **verifyProvider** | Displays matched providers, creates call interaction record | Same empty interaction issue (deferred); passes data to modal via fragile `setTimeout` mechanism instead of declarative template attributes; `selectedProvider()` is a method, not a getter |
| **memberVerificationModal** | Member identity verification form | Close event unmounts modal before async save settles; caller name/phone fields hidden for member-type calls; no user feedback on save failure; dead recursive template code (lines 126-141); DOB display uses regex that doesn't match ISO date format |
| **providerVerificationModal** | Provider identity verification form | Same unmount-before-save issue; caller name/phone hidden unless "calling on behalf" checkbox is checked; `handleInputChange` sets wrong property for Caller Type combobox; Caller Type value never persisted to record; Case Origin not required before verification |

### Visualforce Pages

| Page | Role | Key Problems |
|---|---|---|
| **VerifyMemberVisualforcePage** | Hosts member verification LWC | Uses legacy Lightning Out pattern; `JSON.parse` without `JSENCODE` on merge field |
| **VerifyHealthcareProviderVisualforcePage** | Hosts provider verification LWC | Same issues |

### Trigger

| Trigger | Role | Key Problems |
|---|---|---|
| **HealthcareProviderTrigger** | Deduplicates provider records on insert | **Hardcoded RecordType IDs** — silently fails in every sandbox and non-production environment; no trigger handler pattern; no recursion guard |

---

## Salesforce Best Practices Violations Summary

### Critical (Active Bugs)

| # | Violation | Location | Impact |
|---|---|---|---|
| 1 | Close event unmounts modal before async save settles | Both verification modals | Verification records intermittently not created |
| 2 | Caller identity fields not visible for primary call types | Both verification modals | Caller name and phone never captured for most calls |
| 3 | Hardcoded RecordType IDs | `HealthcareProviderTrigger.trigger` | Trigger fails in any non-production environment |

### High

| # | Violation | Location | Impact |
|---|---|---|---|
| 4 | No exception handling in screen pop entry point | `GenesysCTIExtensionClassV2.cls` | Any future exception crashes silently |
| 5 | Unprotected RecordType SOQL assignment | `GenesysCTIExtensionClassV2.cls` line 117 | Crashes if RecordType missing |
| 6 | Empty Interaction records | `verifyMember.js`, `verifyProvider.js` | Interaction records have no context (deferred) |
| 7 | Imperative data passing via setTimeout | `verifyProvider.js` lines 66-74 | Fragile pattern; data may be undefined |
| 8 | `selectedProvider()` is a method, not a getter | `verifyProvider.js` line 84 | Template binding passes undefined |
| 9 | No error feedback to user | Both verification modals | CSR unaware of failed saves |
| 10 | Silent error swallowing | `DelayedDeleteHandler.cls` | Failed deletions unnoticed |
| 11 | Implicit sharing mode (not explicitly declared) | Both VF page controllers | System mode is intentional but should be declared explicitly as `without sharing` |
| 12 | No exception handling in VF controllers | Both VF page controllers | Invalid parameters crash the page |
| 13 | `handleInputChange` property name mismatch | `providerVerificationModal.js` | Caller Type value set on wrong property; never saved |
| 14 | Case Origin not required for Provider verification | `providerVerificationModal.html` | CSR can verify without selecting Case Origin; inconsistent with member path |

### Medium

| # | Violation | Location | Impact |
|---|---|---|---|
| 15 | No trigger handler pattern | `HealthcareProviderTrigger.trigger` | Untestable, no recursion guard |
| 16 | Merge field without JSENCODE | Both VF pages | Potential parsing/security issue |
| 17 | No phone normalization beyond +1 | `GenesysCTIExtensionClassV2.cls` | Format mismatch risk (working in production; deferred) |
| 18 | No SOQL result limits | `GenesysCTIExtensionClassV2.cls` | Potential governor limit risk |
| 19 | `alert()` for user feedback | `memberVerificationModal.js` | Not accessible, not SLDS |

### Low

| # | Violation | Location | Impact |
|---|---|---|---|
| 20 | `@track` on primitives | All LWCs | Cosmetic |
| 21 | Unused class-level variables | `GenesysCTIExtensionClassV2.cls` | `sf_ANI`, `sf_RecordId` never used |
| 22 | Dead legacy classes in org | 4 inactive screen pop classes | Maintenance confusion |
| 23 | Dead recursive modal template | `memberVerificationModal.html` lines 126-141 | Unreachable code |
| 24 | DOB display inconsistency in modal | `memberVerificationModal.js` | ISO date not matched by regex formatter |
| 25 | ANI not passed to downstream components | `GenesysCTIExtensionClassV2.cls`, VF pages, LWCs | Caller phone available at entry but not forwarded for auto-fill |

---

## Remediation Plan Summary

> For detailed step-by-step instructions with code snippets, see the Remediation Plan section in [genesysCodeAnalysis.md](genesysCodeAnalysis.md).

### Phase 1: Fix Verification Data Logging (Active Bugs)

| Step | Change | What It Fixes |
|---|---|---|
| 1.1 | In `memberVerificationModal`, save the record **before** dispatching the close event; on failure, keep modal open with retry | Verification records lost when modal unmounts before save settles |
| 1.2 | Apply the same save-before-close + retry pattern to `providerVerificationModal` | Same unmount-before-save issue on the provider path |
| 1.3 | Move Caller Name (required) and Phone (optional) outside the Non-Member conditional in `memberVerificationModal` | Caller identity impossible to capture on standard Member calls |
| 1.4 | Move Caller Name (required) and Phone (optional) outside the "calling on behalf" conditional in `providerVerificationModal` | Caller identity impossible to capture on direct Provider calls |
| 1.5 | Pass data to provider modal declaratively via template attributes instead of `setTimeout`; change `selectedProvider()` from method to getter | Race condition where modal may render with undefined data |
| 1.6 | Require Case Origin selection before Verify on the provider path (match member behavior) | CSR can skip Case Origin on provider calls; inconsistent with member path |
| 1.7 | Pass ANI (caller phone number) from Genesys payload through Apex → VF → LWC → modal for phone auto-fill | Caller phone must be manually entered despite being known to the system |

### Phase 2: Best Practices Improvements

| Step | Change | What It Fixes |
|---|---|---|
| 2.1 | Add try-catch to `GenesysCTIExtensionClassV2.onScreenPop()` | Future-proofs against silent screen pop crashes |
| 2.2 | Guard the RecordType query with a list-based check | Prevents crash if RecordType is missing or renamed |
| 2.3 | **(DEFERRED)** Populate `UST_EPLUS__Interaction__c` records with call context fields | Interaction records created with zero fields populated — requires managed package schema inspection |
| 2.4 | **(SEPARATE DEPLOYMENT)** Replace hardcoded RecordType IDs in `HealthcareProviderTrigger` with `Schema.SObjectType` resolution | Trigger silently fails in every non-production environment |
| 2.5 | Fix the Caller Type combobox handler in `providerVerificationModal` | Selected caller type value set on wrong property; never saved |
| 2.6 | Make sharing mode explicit (`without sharing`) on both VF page controllers | Implicit system mode should be documented as intentional |
| 2.7 | Add try-catch to both VF page controller constructors | Malformed URL parameters crash the verification page |
| 2.8 | **(MERGED INTO 1.1/1.2)** Error feedback on save failure | Now included in the save-before-close fix with retry |
| 2.9 | Remove dead recursive modal template from `memberVerificationModal.html` | Unreachable code referencing the component inside itself |

### Phase 3: Cleanup

| Step | Change | What It Fixes |
|---|---|---|
| 3.1 | Add `JSENCODE` to merge fields in both VF pages | Potential parsing/security issue with unescaped data in JavaScript |
| 3.2 | Move trigger logic to a handler class | Untestable inline logic, no recursion guard |
| 3.3 | Improve error logging in `DelayedDeleteHandler` | Failed provider deletions go completely unnoticed |
| 3.4 | Remove deprecated `@track` from primitive properties | Cosmetic cleanup across all LWCs |
| 3.5 | Remove or archive four legacy screen pop classes | Dead code creating maintenance confusion |
| 3.6 | Add `LIMIT` clauses to all SOQL queries in `GenesysCTIExtensionClassV2` | Governor limit risk with unbound queries |
| 3.7 | Remove unused `sf_ANI` and `sf_RecordId` variables | Code clutter |
| 3.8 | **(DEFERRED)** Phone number normalization | No evidence of production issues; full fix requires digits-only formula fields on Account/HCP |

### Deferred Items

| Item | Reason | Prerequisite |
|---|---|---|
| Populate Interaction records (Step 2.3) | Managed package object; needs schema inspection and coordination with data model owner | `sf sobject describe UST_EPLUS__Interaction__c` |
| Phone normalization (Step 3.8) | No evidence of production issues; incomplete without digits-only formula fields | Evidence of format mismatches between Genesys and Salesforce |
| DOB display in modal (Violation #26) | Low severity display-only issue; DOB regex doesn't match ISO date format from Salesforce serialization. Checkbox still enables correctly. | None — can be fixed anytime as a small cleanup |

### Implementation Priority

Steps 1.1 and 1.2 are the highest-impact fixes and should be deployed first — they directly address the verification data loss and include retry-on-failure error handling. Steps 1.3 and 1.4 make caller identity fields always visible with Caller Name required. Step 1.5 eliminates the provider data race condition. Step 1.6 enforces Case Origin on the provider path. Step 1.7 adds the ANI auto-fill pipeline for Caller Phone.

Phase 2 improves code resilience and follows Salesforce best practices. The HealthcareProviderTrigger fix (Step 2.4) is deployed separately from the call-flow fixes to reduce risk.

Phase 3 addresses long-term maintainability. Three items are deferred: Interaction record population (pending managed package schema inspection), phone normalization (pending evidence of format mismatches), and DOB display formatting (low-severity display-only issue).
