# EPlus Verification Workflow — Reverse Engineering Findings

> **Purpose:** This document captures the observed conditional rendering behavior of the EPlus managed package verification workflows for both Member and Provider paths. All findings are based on direct observation of the EPlus UI — screenshots provided in `dev/clientDocs/Member Provider Search.docx` (10 screenshots, 5 EPlus / 5 Genesys side-by-side), and additional sandbox screenshots provided by Jason directly during the reverse-engineering session on 2026-03-25.
>
> **Cross-reference:** Findings validated against `Member Provider Search.docx` and live sandbox screenshots.
>
> **Usage:** This document serves as the requirements baseline for achieving conditional rendering parity in the Genesys screen pop LWCs (the code EIDG owns and controls).

---

## Methodology

- **Environment:** Genesys sandbox (`coaGenesys`) + `Member Provider Search.docx` screenshots + live sandbox screenshots (2026-03-25)
- **Screenshot sources:**
  - `Member Provider Search.docx`: 5 EPlus (Manual Production) / 5 Genesys Sandbox side-by-side pairs — Non-Member path, phase 2
  - Live sandbox screenshots from Jason: EPlus initial state (phase 1), all Case Origin options, Non-Member phase 2 with "Brandon Testing" test record
- **Approach:** Document every field, condition, section header, and validation observed in EPlus, then compare against our current LWC code to produce the gap analysis.
- **Observation status legend:**
  - ✅ CONFIRMED — observed in screenshot or sandbox with high confidence
  - ⚠️ PARTIAL — partially visible; details inferred or require further confirmation
  - 🔲 PENDING — not yet covered; requires sandbox exploration

---

## 1. Member Verification Workflow (EPlus)

### 1.1 Phase 1 — Initial Gate (Case Origin + Member Type)

> **Observation status:** ✅ CONFIRMED — fully documented from live sandbox screenshots (2026-03-25)

#### 1.1.1 Modal Opens

The EPlus Member Verification modal opens showing **only** the Case Origin dropdown. No member data, no checkboxes, and no other fields are shown at this point.

**Interaction banner behavior:**
- If opened from a linked Genesys interaction: Full-width blue banner displays **"Interaction Number is: Int-XXXXXXXXX"** (white bold text).
- If opened manually (standalone, no linked interaction): No banner shown. The modal opens directly with just Case Origin.

**Initial layout:**
- `* Case Origin` — required dropdown (red asterisk), placeholder text: **"Select Case Origin"** or empty
- `← Go Back` button (blue, left arrow icon) — always present
- No Verify button yet

#### 1.1.2 Case Origin Options

> **Observation status:** ✅ CONFIRMED — full dropdown list captured from sandbox screenshot

EPlus Case Origin options (in display order):

| EPlus Display Label | EPlus Stored Value | LWC Label | LWC Value | Match? |
|---|---|---|---|---|
| Inbound - Phone Call | Inbound - Phone Call | Inbound - Phone Call | Inbound - Phone Call | ✅ |
| Outbound - Phone Call | Outbound - Phone Call | Outbound - Phone Call | Outbound - Phone Call | ✅ |
| Chat | Chat | Chat | Chat | ✅ |
| Walk-In | Walk-In | Walk In _(no hyphen in label)_ | Walk-In | ⚠️ Label mismatch |
| Research | Research | Research | Research | ✅ |
| Transfer | Transfer | Transfer | Transfer | ✅ |
| Email | Email | Email | Email | ✅ |
| Fax | Fax | Fax | Fax | ✅ |
| Voice Mail | Voice Mail | Voice Mail | Voice Mail | ✅ |
| Mail | Mail | Mail | Mail | ✅ |
| Meeting – Virtual | Meeting – Virtual _(em dash)_ | Meeting - Virtual _(regular hyphen in label)_ | Meeting – Virtual _(em dash in value)_ | ⚠️ Label mismatch |

**Note on Walk-In and Meeting – Virtual:** The EPlus-displayed labels include a hyphen and em dash respectively. Our LWC's `caseOriginOptions` getter uses slightly different label text (no hyphen for Walk-In, regular hyphen for Meeting). The stored **values** match (Walk-In, Meeting – Virtual em dash). This is a cosmetic discrepancy in how the option appears to the CSR while selecting. Not a functional bug, but should be aligned for consistency.

#### 1.1.3 Conditional Logic After Case Origin Selection

> **Observation status:** ✅ CONFIRMED — per sandbox screenshots and Jason's explicit note

**Rule (authoritative):** Member Type dropdown is only shown for **Inbound - Phone Call** and **Outbound - Phone Call** Case Origins.

| Case Origin | Member Type Shown? | Verify Button Shown? | Next Step |
|---|---|---|---|
| Inbound - Phone Call | ✅ Yes (`* Member Type`) | No (until Member Type selected) | Select Member Type → phase 2 |
| Outbound - Phone Call | ✅ Yes (`* Member Type`) | No (until Member Type selected) | Select Member Type → phase 2 |
| Chat | No | ✅ Yes | Click Verify directly |
| Walk-In | No | ✅ Yes | Click Verify directly |
| Research | No | ✅ Yes | Click Verify directly |
| Transfer | No | ✅ Yes | Click Verify directly |
| Email | No | ✅ Yes | Click Verify directly |
| Fax | No | ✅ Yes | Click Verify directly |
| Voice Mail | No | ✅ Yes | Click Verify directly |
| Mail | No | ✅ Yes | Click Verify directly |
| Meeting – Virtual | No | ✅ Yes | Click Verify directly |

**Critical implication:** For all non-phone Case Origins, clicking Verify from phase 1 creates the verification record with only Case Origin populated — no member identity checkboxes, no Representative Details. This is a much lighter-weight verification path.

#### 1.1.4 Member Type Options (Phone Origins Only)

`* Member Type` dropdown, placeholder: **"Select Member Type"** (required, red asterisk)

- Member
- Non-Member

Selecting either value transitions to **phase 2** and hides phase 1 entirely.

#### 1.1.5 Phase 1 Button Summary

| Button | Label | Icon | Visibility | Behavior |
|---|---|---|---|---|
| Go Back | `← Go Back` | Left arrow | Always | Returns to member search results |
| Verify | `✓ Verify` | Checkmark | Non-phone origins after Case Origin selected; phone origins after Member Type selected | Creates verification record / transitions to phase 2 |

**Note:** EPlus has a "← Go Back" button as the primary dismissal action in phase 1, NOT a "Close" button. Our LWC has a "Close" button in the modal footer.

---

### 1.2 Phase 2 — Member Details Section

> **Observation status:** ✅ CONFIRMED via multiple screenshots (Member Provider Search.docx images 1,3,5,7,9 + live sandbox screenshot 2026-03-25)

**Triggered by:** Member Type = Member or Non-Member (for phone origins). Phase 1 fields disappear; phase 2 renders.

**Interaction banner:** Full-width blue banner **"Interaction Number is: Int-XXXXXXXXX"** shown at top of phase 2 content area.

**Section header:** `Member Details` (bold, left-aligned) with a small info icon (ⓘ) immediately to the right of the label.

#### 1.2.1 Checkboxes + Data Layout

Two-column layout. Left column: checkbox + label. Right column: value (raw, no label prefix).

| Checkbox Label | Required Asterisk? | Data Display | When Disabled? |
|---|---|---|---|
| Member ID | No | Raw value (e.g. `123456`, `C01112994-00`) | When field is empty |
| SSN | No | Masked value (e.g. `XXX-XX-1969`) or empty | When field is empty |
| Member Name | **Yes (`*`) — only when data present** | Raw full name (e.g. `Brandon Testing`, `MOSES SMITH`) | When field is empty |
| Date of Birth | **Yes (`*`) — only when data present** | Raw date in M/D/YYYY format (e.g. `6/25/2020`) | When field is empty |
| Phone Number | No | Formatted phone as **blue hyperlink** (e.g. `(303) 506-4176`) — clickable `tel:` style | When field is empty |
| Mailing Address | **Yes (`*`) — only when data present** | Multi-line: street, city+state+zip, country (e.g. `3912 Alcazar Dr / Castle Rock, CO 80109 / US`) | When field is empty |

**Key observations:**
- Required asterisks appear on Member Name, Date of Birth, and Mailing Address **only when the corresponding field has data**. If the field is empty and the checkbox is disabled, no asterisk is shown.
- Data values are shown **without field label prefixes**. Our LWC shows `Member Id:`, `SSN:`, `Member Name:` etc. as bold prefixes — EPlus does not have these.
- Phone number is rendered as a **blue hyperlink** (clickable `tel:`). Our LWC renders plain text.
- Mailing Address includes a **country line** (`US`). Our LWC does not show country.
- Date of Birth uses **M/D/YYYY** format (no zero-padding). Our LWC formats as MM/DD/YYYY.
- Disabled (empty) checkboxes appear visually greyed out — user cannot check them.

---

### 1.3 Phase 2 — Case Origin in EPlus

> **Observation status:** ✅ CONFIRMED — Case Origin IS part of EPlus verification. It is captured in phase 1 and does NOT appear again in phase 2.

**Correction of earlier assumption:** EIDG did not invent Case Origin for the verification flow. EPlus has always had it as the first required field. Once Case Origin is selected in phase 1 and the user advances to phase 2, Case Origin is no longer displayed in the phase 2 view — it has been captured.

Our LWC currently displays Case Origin as a dropdown alongside Member Type in the same initial view. The structural difference is that our LWC shows them simultaneously, while EPlus shows Case Origin first, then conditionally adds Member Type beneath it. The end data captured is equivalent.

---

### 1.4 Phase 2 — Representative Details Section (Non-Member path)

> **Observation status:** ✅ CONFIRMED via multiple screenshots

**Triggered by:** Member Type = Non-Member (appears immediately below Member Details, no additional action needed)

**Section header:** `Representative Details` (bold, left-aligned).

**Initial state (no Representative Type selected):**
- `* Representative Type` — required dropdown (red asterisk), placeholder: **"Select Representative Type"**
- No other fields visible.
- Both Cancel and Verify buttons visible at the bottom.

**Caller Name / Caller Phone:** NOT present in EPlus in phase 2. EPlus does not capture caller name or caller phone in the member verification modal. These are EIDG additions (Body 1) to improve data capture. They should remain in our LWC.

#### 1.4.1 Button Layout (Phase 2)

Both buttons are blue (same color, not neutral/cancel styling):

| Button | Label | Icon | Notes |
|---|---|---|---|
| Cancel | `× Cancel` | X icon | Cancels verification — EPlus-style. Both buttons are blue. |
| Verify | `✓ Verify` | Checkmark | Submits verification |

**Important:** In EPlus, "Cancel" is styled the same as "Verify" (both blue). Our LWC has "Close" in the modal footer as a neutral-colored button. The placement and label differ.

---

### 1.5 Legal Representative Path

> **Observation status:** ✅ CONFIRMED via Member Provider Search.docx image3 + live sandbox screenshots (2026-03-25)

**Trigger:** `Representative Type` = `Legal Representative`

**Fields revealed:**

| Field | Label | Type | Required | Active? | Notes |
|---|---|---|---|---|---|
| Name | `* Name` | Lookup/search dropdown ("Select Name") | **Yes** | **Disabled when no auth rep records exist** | Lookup to EPlus-managed authorized representative records. Grey/deactivated appearance when this member has no linked authorized representative records. In production use with real members who have authorized reps on file, this lookup would be active and searchable. |

**Key clarification (confirmed by Jason 2026-03-25):** The `* Name` dropdown **renders** immediately when Legal Representative is selected, but is **deactivated** in this sandbox because the test member "Brandon Testing" (ID 123456) has no authorized representative records in EPlus. The disabled state is data-driven — it is not statically disabled. In production, this dropdown would be active and populated with authorized rep names from the EPlus managed package.

**Checkbox independence confirmed:** Checking or unchecking verification checkboxes (e.g. Member Name) has no effect on the Name lookup field state. The two sections are fully independent.

**Fields NOT shown:** Relationship Type, Caller Name, Caller Phone, Description, Auth Type, Start Date, End Date.

**EPlus vs. Genesys gap:** Our LWC shows a `Description` textarea when any Representative Type is selected. EPlus shows a Name record lookup (driven by existing EPlus data). Our LWC has **no Name lookup field** for Legal Representative. This is a scope discussion item — replicating it requires querying EPlus managed package objects.

---

### 1.6 Personal Representative Path

> **Observation status:** ✅ FULLY CONFIRMED — all 7 Relationship Type options individually captured in live sandbox screenshots (2026-03-25)

**Trigger:** `Representative Type` = `Personal Representative`

**Fields revealed immediately:**

| Field | Label | Type | Required | Notes |
|---|---|---|---|---|
| Relationship Type | `* Relationship Type` | Dropdown | **Yes** | Options: Parent, Guardian, County DHS, POA, Advocate, Legal Rep, Other |

**Relationship Type options (confirmed via open dropdown screenshot):** Parent, Guardian, County DHS, POA, Advocate, Legal Rep, Other — **exact match to our LWC**.

**Inline validation on Relationship Type:** Clicking Verify without selecting a Relationship Type triggers a **red border** on the dropdown and inline red text beneath it: **"Please Select Relationship Type"**. This inline validation pattern is consistent with the general EPlus validation approach.

#### 1.6.1 When Relationship Type = Parent

> **Observation status:** ✅ CONFIRMED via live sandbox screenshot (2026-03-25)

| Field | Label | Type | Required | Active? | Notes |
|---|---|---|---|---|---|
| Parent lookup | `* Parent` | Lookup dropdown ("Select Name") | **Yes** | **Disabled** (grey, no records) | Same data-driven lookup as Legal Rep `* Name`. Disabled because test member has no authorized parent record in EPlus. |
| Auth Type | `Auth Type` | Read-only text | No | N/A | `Personal Representative` — static, no interaction |

**Fields NOT shown for Parent:** `* Name` text input, `* Caller Phone`, Description, Start Date, End Date.

**Parent is structurally unique** compared to all other Relationship Types. It shows a name lookup (data-driven, disabled when no records) and Auth Type only. No free-text entry fields.

#### 1.6.2 When Relationship Type = Guardian

> **Observation status:** ✅ CONFIRMED via live sandbox screenshot (2026-03-25)

| Field | Label | Type | Required | Active? | Notes |
|---|---|---|---|---|---|
| Name | `* Name` | Text input | **Yes** | ✅ Active (white bg) | Free-text entry by CSR — NOT a lookup |
| Caller Phone | `* Caller Phone` | Text input | **Yes** | ✅ Active | CSR enters the representative's phone number |
| Description | `Description` | Textarea | No | ✅ Active | Optional notes |
| Auth Type | `Auth Type` | Read-only text | No | N/A | `Personal Representative` |
| Start Date | `Start Date` | Read-only date | No | N/A | Auto-populated to **today's date** (3/25/2026). EPlus initializes a new authorization record; start date defaults to today. |
| End Date | `End Date` | Date picker | No | ✅ Active | Defaults to **today's date** (3/25/2026); CSR can edit. Calendar icon present. |

#### 1.6.3 When Relationship Type = County DHS, POA, Advocate, Legal Rep, or Other

> **Observation status:** ✅ FULLY CONFIRMED — all five captured individually in live sandbox screenshots (2026-03-25)

**All five show an identical field set to Guardian.** No variation between them.

| Field | Label | Type | Required | Notes |
|---|---|---|---|---|
| Name | `* Name` | Text input | **Yes** | Active, free-text |
| Caller Phone | `* Caller Phone` | Text input | **Yes** | Active |
| Description | `Description` | Textarea | No | Active, optional |
| Auth Type | `Auth Type` | Read-only | No | `Personal Representative` |
| Start Date | `Start Date` | Read-only | No | Today's date (auto-populated) |
| End Date | `End Date` | Date picker | No | Today's date, editable |

#### 1.6.4 Personal Representative — Field Matrix Summary

| Field | Parent | Guardian | County DHS | POA | Advocate | Legal Rep | Other |
|---|---|---|---|---|---|---|---|
| `* Parent` lookup (disabled) | ✅ | — | — | — | — | — | — |
| `* Name` text input | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `* Caller Phone` text | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `Description` textarea | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `Auth Type` (read-only) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `Start Date` (read-only) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `End Date` (date picker) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

#### 1.6.5 EPlus Authorization Record Creation Pattern

The Start Date defaulting to today (rather than a historical date from an existing record) indicates EPlus is **creating a new authorization record in real time** for Guardian/County DHS/POA/Advocate/Legal Rep/Other types. The CSR is effectively registering a new authorized representative relationship during the verification call. Parent shows a lookup because parents may already be registered in the system.

This has scope implications: replicating this behavior in our LWC would require write access to EPlus managed package objects to create authorization records — this is not trivial and requires a scoping decision with COA.

---

### 1.7 Verify Button Behavior (Phase 2)

> **Observation status:** ⚠️ PARTIAL

**Confirmed from screenshots:**
- Verify button visible from the moment phase 2 renders — even with zero checkboxes checked.
- Cancel button also always visible alongside Verify.
- Inline validation fires on the `* Parent` lookup field when Verify is clicked without a selection: **"Complete this field."** (red text beneath the field).
- Minimum checkbox count for successful verification: **🔲 PENDING** — requires sandbox testing (try Verify with 0, 1, 2 checkboxes).
- Success behavior after Verify: **🔲 PENDING** — does modal close? Does page navigate? Toast message?
- Error behavior for insufficient checkboxes: **🔲 PENDING**

---

### 1.8 Member (Standard — not Non-Member) Path

> **Observation status:** ✅ CONFIRMED via live sandbox screenshot (2026-03-25)

**Trigger:** Member Type = `Member`

**Phase 2 renders with Member Details only. No Representative Details section is shown at all.** There is no conditional rendering within the Member path — it is the simplest possible phase 2 state.

**Layout:**
1. Interaction banner: `Interaction Number is: Int-XXXXXXXXX` (blue, bold)
2. `Member Details` section header (bold + ⓘ icon)
3. Checkboxes + data — identical to Non-Member path (Member ID, SSN, Member Name, Date of Birth, Phone Number, Mailing Address; disabled when field is empty)
4. Horizontal divider line
5. `× Cancel` and `✓ Verify` buttons (both blue)

**NOT shown:** Representative Details section header, Representative Type dropdown, any representative fields.

**Confirmed (per Jason 2026-03-25):** *"For member, there is no conditional rendering visible."*

**EPlus vs. Genesys:** Our current LWC's Member path also hides `showRepresentativeDetails` when Member Type = Member (`this.showRepresentativeDetails = this.memberTypeValue === 'Non-Member'`). This is correct behavior — no gap here for the Member path.

| Field | EPlus (Member path) | Genesys LWC (Member path) | Match? |
|---|---|---|---|
| Interaction banner | ✅ | ✅ | ✅ (label text differs: M-P1-07) |
| Member Details header | ✅ | ❌ | ❌ |
| Member ID checkbox | ✅ | ✅ | ✅ |
| SSN checkbox | ✅ | ✅ | ✅ |
| Member Name checkbox | ✅ | ✅ | ✅ |
| Date of Birth checkbox | ✅ | ✅ | ✅ |
| Phone Number checkbox | ✅ | ✅ | ✅ |
| Mailing Address checkbox | ✅ | ✅ | ✅ |
| Caller Name (EIDG add) | ❌ | ✅ | N/A |
| Caller Phone (EIDG add) | ❌ | ✅ | N/A |
| Representative Details section | ❌ | ❌ | ✅ |
| Cancel / Close | ✅ `× Cancel` (blue, body) | ✅ `Close` (neutral, footer) | ⚠️ Style/label |
| Verify | ✅ | ✅ | ✅ |

---

## 2. Provider Verification Workflow (EPlus)

> **Observation status:** ✅ CONFIRMED — fully documented from live sandbox screenshots provided by Jason (2026-03-25). All 7 Case Origin options captured. "Are you calling on behalf of a provider?" checked state captured for both Inbound and Outbound. No additional conditional rendering found per Jason's confirmation.

### 2.1 Modal Structure — Always Present

The EPlus Provider Verification modal has a distinct layout from the Member modal. Unlike Member's two-phase flow, Provider is **single-phase** — there is no intermediate Case Origin gate before the full layout renders. The modal opens immediately with all structural elements.

**Always-present elements (all Case Origins):**

| Element | Detail |
|---|---|
| Modal title | `Provider Verification` — centered, no subtitle |
| X close button | Top-right corner of modal container — always present |
| Interaction banner | Full-width blue bar: **`Interaction Number is: Int-XXXXXXXXX`** (bold white text) |
| `Case Origin *` label + dropdown | Asterisk appears **after** the label text: `Case Origin *`. Default: no selection. |
| `× Cancel` button | Blue, bottom-center. X icon. Always present. |
| `✓ Verify` button | Blue, bottom-center. Checkmark icon. Always present. |

**Important structural notes:**
- Unlike the Member modal, there is **no Go Back button**. Provider uses `× Cancel` (blue) and X close (top-right) for dismissal.
- The `Case Origin *` asterisk position is **after** the label text in Provider, whereas Member uses `* Case Origin` (asterisk before, via the SLDS `required` pattern). This is a visual difference in EPlus itself between the two modals.
- Provider has **no phase 1 / phase 2 split**. Case Origin and all other fields are visible in the same single view.
- ⚠️ **PENDING — "Provider Details" section header:** The Member modal uses a `Member Details` section header (bold + ⓘ icon) above the checkbox group. Screenshots of the Provider modal do not clearly confirm whether an equivalent `Provider Details` (or similar) header exists above the verification checkboxes. This should be confirmed from a sandbox screenshot before implementing. Gap reference: **P-17** (see §3.3).

---

### 2.2 Case Origin Options and Conditional Rendering

> **Observation status:** ✅ CONFIRMED — full dropdown confirmed from screenshot; all 7 options individually captured.

**Provider Case Origin options (7 total — fewer than Member's 11):**

| EPlus Display Label | EPlus Stored Value | LWC Label | LWC Value | Match? |
|---|---|---|---|---|
| Inbound - Phone Call | Inbound - Phone Call | Inbound - Phone Call | Inbound - Phone Call | ✅ |
| Outbound - Phone Call | Outbound - Phone Call | Outbound - Phone Call | Outbound - Phone Call | ✅ |
| Email | Email | Email | Email | ✅ |
| Voice Mail | Voice Mail | Voicemail _(one word)_ | Voicemail _(one word)_ | ❌ **Both label and value mismatch** |
| Research | Research | Research | Research | ✅ |
| Meeting – Virtual | Meeting – Virtual _(em dash)_ | Meeting - Virtual _(regular hyphen)_ | Meeting - Virtual _(regular hyphen)_ | ❌ **Both label and value mismatch** |
| Meeting – In Person | Meeting – In Person _(em dash)_ | Meeting - In Person _(regular hyphen)_ | Meeting - In Person _(regular hyphen)_ | ❌ **Both label and value mismatch** |

**Important — stored value mismatches (Voice Mail, Meeting – Virtual, Meeting – In Person):** Unlike the Member modal where label-only cosmetic differences existed but values were correct, the Provider LWC has mismatches in **both** the display label and the stored value. Any downstream report, filter, or automation keying on `Case Origin = 'Voice Mail'` will not match records saved as `'Voicemail'`. These are data integrity gaps, not cosmetic ones, and must be fixed in both label and value simultaneously.

**Missing from Provider vs. Member options:** Chat, Walk-In, Transfer, Fax, Mail — these five do not appear in the Provider Case Origin dropdown. The Provider list is a strict subset of the Member list.

**Conditional rendering rule (confirmed from all 7 screenshots):**

| Case Origin | Verification checkboxes shown? | "Are you calling on behalf?" shown? |
|---|---|---|
| Inbound - Phone Call | ✅ Yes | ✅ Yes |
| Outbound - Phone Call | ✅ Yes | ✅ Yes |
| Email | ❌ No | ❌ No |
| Voice Mail | ❌ No | ❌ No |
| Research | ❌ No | ❌ No |
| Meeting – Virtual | ❌ No | ❌ No |
| Meeting – In Person | ❌ No | ❌ No |

**For non-phone origins (Email, Voice Mail, Research, Meeting – Virtual, Meeting – In Person):** The modal shows only the Interaction banner, Case Origin dropdown, and Cancel + Verify buttons. No checkboxes, no provider data, no "calling on behalf" checkbox. The CSR can submit Verify immediately with only Case Origin.

This phone/non-phone gate is **structurally identical** to the Member workflow gate — but implemented as a single phase in Provider, rather than a two-phase transition.

---

### 2.3 Verification Checkboxes (Phone Origins Only)

> **Observation status:** ✅ CONFIRMED — two-column layout with checkbox+label left, value right. Captured from Inbound Phone Call screenshot (same layout confirmed for Outbound).

Two-column layout. Left: checkbox + label. Right: value (raw, no prefix label — same pattern as Member).

| # | Checkbox Label | Required Asterisk? | Observed Value | When Disabled? |
|---|---|---|---|---|
| 1 | Provider Name | No | `Test HCP - BOTH MATCH` (active, white bg) | When field is empty |
| 2 | Provider ID | No | _(empty — greyed out)_ | When field is empty |
| 3 | Provider TIN | No | _(empty — greyed out)_ | When field is empty |
| 4 | Provider Contact # | No | `(720) 224-1440` — **blue hyperlink** | When field is empty |
| 5 | Provider NPI | **Yes (`*`)** — red asterisk | `2222222222` (active, white bg) | When field is empty |
| 6 | Address | No | _(empty — greyed out)_ | When field is empty |

**Key observations:**
- `* Provider NPI` is the only required checkbox field — asterisk shown only because data is present (same required-when-populated logic as Member Name/DOB/Address in the Member modal).
- `Provider Contact #` value rendered as a **blue hyperlink** (clickable, `tel:` style) — same pattern as Member's Phone Number.
- Data values shown **without field label prefixes** — same as Member. Raw values only in the right column.
- Disabled checkboxes are visually greyed (same as Member behavior).
- Checkbox order in EPlus: Provider Name → Provider ID → Provider TIN → Provider Contact # → *Provider NPI → Address.

**Checkboxes present in EPlus but NOT in our LWC:**
- `Provider Contact #` — our LWC uses label `Phone Number` for this field (label mismatch, field likely maps to same underlying data).

**Checkboxes in our LWC but NOT in EPlus:**
- `Provider Status` — our LWC includes this option; EPlus does not have it.

---

### 2.4 "Are you calling on behalf of a provider?" Checkbox

> **Observation status:** ✅ CONFIRMED — unchecked default state confirmed for both Inbound and Outbound; checked state fully documented from screenshots provided 2026-03-25.

**Default state:** Unchecked. Visible for phone origins only (Inbound and Outbound). Not shown for non-phone origins.

**When checked (Inbound or Outbound Phone Call):**

Four additional fields appear immediately below the checkbox:

| # | Field Label | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| 1 | `* Caller Name:` | Text input | **Yes** (red asterisk) | Empty | Free text |
| 2 | `Caller Type` | Combobox | No | `--None--` | Options: ⚠️ PENDING — dropdown not opened in screenshots |
| 3 | `Phone Number:` | Text input | No | Empty | Caller's phone number |
| 4 | `Phone Extension:` | Text input | No | Empty | Optional extension |

**Confirmed identical for both Inbound and Outbound Phone Call** — Jason confirmed same rendering for Outbound (separate screenshot provided).

**Confirmed by Jason (2026-03-25):** *"No other UI actions cause additional conditional rendering that I can find."* — No further nesting or conditional fields within this section.

**EPlus vs. EIDG structural difference:**

In EPlus, Caller Name, Phone Number, and Phone Extension are **inside the "on behalf" conditional block** — they only appear when the checkbox is checked. In our LWC (Body 1 changes), Caller Name (required) and Phone Number (optional, ANI pre-filled) are **always visible** at the top level, and Caller Type + Phone Extension appear inside the on-behalf conditional section.

This is an intentional EIDG departure from EPlus: Body 1 made Caller Name/Phone always-visible to ensure caller identity is captured regardless of whether the CSR answers the on-behalf question. These fields should remain always-visible in our LWC.

---

### 2.5 Verify Button Behavior

> **Observation status:** ⚠️ PARTIAL

**Confirmed from screenshots:**
- `✓ Verify` button is visible from modal open — for all Case Origins, no selection required before it appears.
- For non-phone origins, Verify is available immediately with only Case Origin selection.
- For phone origins, Verify appears alongside the checkbox section without requiring any checkboxes to be checked.

**Still pending:**
- Minimum checkbox count EPlus requires before Verify succeeds (0? 1? 2?).
- Error message text when validation fails on Verify click.
- Success behavior — does modal close? Navigation? Toast?
- Caller Type dropdown options (dropdown not opened in available screenshots).

---

## 3. Gap Analysis: EPlus vs. Genesys Screen Pop LWC

### 3.1 Member Verification — Phase 1 Gaps

| # | EPlus Behavior | Current Genesys LWC | Gap Type | Priority | Notes |
|---|---|---|---|---|---|
| M-P1-01 | Case Origin shown first, alone | Case Origin + Member Type shown **simultaneously** | Flow sequencing | Medium | EPlus is sequential; LWC is parallel. End data is equivalent. |
| M-P1-02 | Non-phone Case Origins → Verify immediately (no checkboxes) | All origins → require Member Type + show checkboxes | **Critical behavioral gap** | **High** | LWC currently blocks non-phone paths from completing. `checkSelectionsAndDisplayVerification()` requires both `caseOriginValue` AND `memberTypeValue` — non-phone origins never set memberTypeValue. **Current LWC bug.** |
| M-P1-03 | Button label: `← Go Back` | Button label: `Close` | Label + icon | Low | EPlus uses Go Back with left arrow; modal also has X close button in top right. |
| M-P1-04 | Case Origin option label: `Walk-In` (hyphen) | LWC label: `Walk In` (no hyphen in label; value has hyphen) | Label cosmetic | Low | Value match is correct; label display slightly different. |
| M-P1-05 | Case Origin option label: `Meeting – Virtual` (em dash) | LWC label: `Meeting - Virtual` (regular hyphen) | Label cosmetic | Low | Value (em dash) matches correctly. |
| M-P1-06 | Member Type placeholder: `Select Member Type` | LWC placeholder: `Select Member Type` (same) | No gap | — | ✅ Match |
| M-P1-07 | Interaction banner text: `Interaction Number is: Int-XXXXX` | LWC banner: `Interaction: Int-XXXXX` | Label | Low | "Interaction Number is:" vs "Interaction:" |

### 3.2 Member Verification — Phase 2 Gaps (Non-Member Path)

| # | EPlus Behavior | Current Genesys LWC | Gap Type | Priority | Notes |
|---|---|---|---|---|---|
| M-P2-01 | `Member Details` section header (bold + ⓘ icon) | No section header | Structure | Medium | EPlus clearly delineates the two sections with bold headers |
| M-P2-02 | `Representative Details` section header (bold) | No section header | Structure | Medium | |
| M-P2-03 | Data values shown **without label prefixes** | Data shown with bold label prefixes (`Member Id:`, `SSN:` etc.) | Layout | Medium | EPlus is cleaner; labels live only in the checkbox column |
| M-P2-04 | Phone Number as **blue hyperlink** | Phone as plain text | Styling | Low | |
| M-P2-05 | Mailing Address includes **country** (`US`) | No country line | Field content | Low | |
| M-P2-06 | Date of Birth: **M/D/YYYY** (no zero-padding) | **MM/DD/YYYY** (zero-padded) | Date format | Low | |
| M-P2-07 | Required asterisk on Member Name, DOB, Mailing Address — **only when field has data** | Same logic via `verificationOptionsWithDisabled` | No gap | — | ✅ LWC correctly disables and removes asterisk when field empty |
| M-P2-08 | `* Caller Name` — **NOT in EPlus** | `* Caller Name` always visible | Intentional EIDG add | — | Keep; improves data capture |
| M-P2-09 | Caller Phone — **NOT in EPlus** | Caller Phone visible, ANI-prefilled | Intentional EIDG add | — | Keep; improves data capture |
| M-P2-10 | Rep Type placeholder: `Select Representative Type` | `Select an Option` | Placeholder text | Low | Should align to EPlus label |
| M-P2-11 | Rep Type required (`*`) | Rep Type shown but no `required` attribute enforced | Required attribute | Medium | EPlus makes it explicitly required with red asterisk |
| M-P2-12 | Relationship Type required (`*`) | Not marked required | Required attribute | Medium | |
| M-P2-13 | Legal Rep → `* Name` lookup (existing records) | Legal Rep → `Description` textarea | Structural gap | High | EPlus lookup ties to managed package data; requires scoping discussion |
| M-P2-14 | Personal Rep → Parent → `* Parent` lookup + `Auth Type` | Personal Rep → Parent → `Description` only | Structural gap | High | Lookup + read-only field missing |
| M-P2-15 | Personal Rep → Guardian → `* Name`, `* Caller Phone`, `Description`, `Auth Type`, `Start Date`, `End Date` | Guardian → `Description` only | Structural gap | High | Five fields missing |
| M-P2-16 | Personal Rep → other rel types → same as Guardian | Description only | Structural gap | High | |
| M-P2-17 | Inline field validation (`"Complete this field."` under field) | Banner error message | Validation UX | Medium | EPlus shows inline errors; LWC shows a top-level error string |
| M-P2-18 | Cancel button: **blue**, `× Cancel`, in modal body | Close button: neutral, in modal footer | Button style + placement | Low | |
| M-P2-19 | `Description` textarea — **NOT in EPlus** | `Description` textarea shown for all rep paths | No EPlus equivalent | Low | Our LWC shows Description; EPlus does not. Evaluate whether to keep. |

### 3.3 Provider Verification — Gap Analysis

> **Observation status:** ✅ CONFIRMED — based on full set of Provider screenshots (2026-03-25)

| # | EPlus Behavior | Current Genesys LWC | Gap Type | Priority | Notes |
|---|---|---|---|---|---|
| P-01 | **Phone/non-phone gate:** Checkboxes + "on behalf" shown only for Inbound/Outbound Phone Call; non-phone origins show Case Origin only | **No gate:** All fields shown always | **Critical behavioral gap** | **High** | Our LWC currently always renders all checkboxes and the "on behalf" checkbox regardless of Case Origin. Must be gated the same way as EPlus. |
| P-02 | Checkbox label: `Provider Contact #` | Checkbox label: `Phone Number` | Label mismatch | Medium | Different label for the same underlying field. Should align to EPlus standard. |
| P-03 | `Provider Status` checkbox: **NOT present in EPlus** | `Provider Status` checkbox: present in LWC | Extra field in LWC | Medium | EPlus does not include Provider Status as a verifiable attribute. Evaluate with COA — remove for parity or keep as EIDG addition. |
| P-04 | Checkbox order: Provider Name → Provider ID → Provider TIN → Provider Contact # → *Provider NPI → Address | Checkbox order: NPI → Provider Name → Phone Number → Provider Id → Provider TIN → Provider Status → Provider Address | Ordering mismatch | Medium | EPlus puts NPI second-to-last (required); our LWC puts it first. Re-ordering to match EPlus would improve parity and CSR familiarity. |
| P-05 | Case Origin label: `Case Origin *` (asterisk **after** label text) | `required` attribute → renders `* Case Origin` (asterisk **before** via SLDS) | Asterisk position | Low | Cosmetic difference driven by SLDS `required` rendering convention. Not a functional gap. |
| P-06 | Case Origin option: `Voice Mail` (two words) — **value is "Voice Mail"** | Case Origin option: `Voicemail` (one word) — **value stored as "Voicemail"** | Label **and** value mismatch | **High** | Stored value differs. Reports and filters on Case Origin = "Voice Mail" will not match records saved as "Voicemail". Must fix both label and value. |
| P-07 | Case Origin option: `Meeting – Virtual` (em dash) — value: `Meeting – Virtual` | Label: `Meeting - Virtual` (regular hyphen) — value: `Meeting - Virtual` | Label **and** value mismatch | **High** | Same stored-value mismatch risk as Voice Mail. Fix both label and value to use em dash. |
| P-08 | Case Origin option: `Meeting – In Person` (em dash) — value: `Meeting – In Person` | Label: `Meeting - In Person` — value: `Meeting - In Person` | Label **and** value mismatch | **High** | Same as P-07. Fix to em dash. |
| P-09 | `× Cancel` and `✓ Verify` — both **blue**, in modal **body** | `Close` — neutral, in **modal footer** | Button style + placement | Low | EPlus uses body-level Cancel (blue), not a footer-level neutral close. Matches Member modal pattern. |
| P-10 | Caller Name (`* Caller Name:`) — inside "on behalf" conditional block, required | Caller Name (`* Caller Name`) — **always visible**, top-level, required (Body 1 add) | Placement intentional | N/A | EIDG deliberately moved Caller Name to always-visible for data capture reliability (Body 1, §D2). Keep as-is. |
| P-11 | Phone Number — inside "on behalf" conditional block, optional | Phone Number — **always visible**, ANI pre-filled (Body 1 add) | Placement intentional | N/A | Same rationale as P-10. Keep always-visible per Body 1 design. |
| P-12 | Caller Type — inside "on behalf" conditional block, combobox, `--None--` default | Caller Type — inside "on behalf" conditional block, combobox | ✅ No structural gap | — | Placement matches. Options ⚠️ PENDING (Caller Type dropdown not opened in available screenshots). Our LWC options: Billing Office, Provider/Clinical Office, Hospital Staff/Facility, Other. |
| P-13 | `Phone Extension:` — inside "on behalf" conditional block, optional text input | `Phone Extension` — inside "on behalf" conditional block, optional | ✅ No structural gap | — | Matches EPlus. |
| P-14 | Interaction banner: `Interaction Number is: Int-XXXXXXXXX` (blue, bold) | Interaction banner: `Interaction: Int-XXXXXXXXX` (based on `interactionName` prop) | Label text | Low | "Interaction Number is:" vs "Interaction:" — should align to EPlus wording. |
| P-15 | Provider modal: **single-phase** (no Case Origin gate before full render) | Provider modal: all fields always visible, no phase — ✅ single-phase | ✅ No phase-gate gap | — | Both are single-phase. The gap is the phone/non-phone conditional within the single phase (P-01). |
| P-16 | Phone Number value: `(720) 224-1440` rendered as **blue hyperlink** | Phone Number rendered as plain text | Styling | Low | Matches Member path gap M-P2-04. Render as `tel:` hyperlink. |
| P-17 | ⚠️ "Provider Details" section header — presence/absence **unconfirmed** | No section header in LWC | Structure | ⚠️ TBD | Member modal has `Member Details` header + ⓘ icon above the checkbox group. Provider screenshots do not clearly show whether an equivalent header exists. Requires one additional screenshot to confirm before implementing. |

---

## 4. Field-by-Field Rendering Table — Member Verification

### 4.1 Phase 1

| Field | EPlus | Required? | Genesys LWC | Required? | Match? |
|---|---|---|---|---|---|
| Interaction banner | ✅ When linked interaction | n/a | ✅ Always | n/a | ⚠️ LWC always shows; EPlus only when linked |
| Case Origin | ✅ Always (phase 1) | Yes | ✅ Always | Yes | ✅ |
| Member Type | ✅ Phone origins only | Yes | ✅ Always | Yes | ❌ LWC always shows; EPlus conditional |
| Verify button (phase 1) | ✅ Non-phone after CO; phone after MT | n/a | ❌ Never in phase 1 | n/a | ❌ LWC never shows Verify in phase 1 |
| Go Back / Close | ✅ `← Go Back` always | n/a | ✅ `Close` always | n/a | ⚠️ Label/style differs |

### 4.2 Phase 2 — Non-Member Path

| Field | EPlus | Required? | Genesys LWC | Required? | Match? |
|---|---|---|---|---|---|
| Interaction banner | ✅ When linked | n/a | ✅ Always | n/a | ⚠️ |
| "Member Details" header | ✅ | n/a | ❌ | n/a | ❌ |
| Member ID checkbox | ✅ | No | ✅ | No | ✅ |
| SSN checkbox | ✅ | No | ✅ | No | ✅ |
| Member Name checkbox | ✅ | Yes (when data) | ✅ | Yes (when data) | ✅ |
| Date of Birth checkbox | ✅ | Yes (when data) | ✅ | Yes (when data) | ✅ |
| Phone Number checkbox | ✅ | No | ✅ | No | ✅ |
| Mailing Address checkbox | ✅ | Yes (when data) | ✅ | Yes (when data) | ✅ |
| Caller Name | ❌ | — | ✅ | Yes | N/A (EIDG add) |
| Caller Phone (top level) | ❌ | — | ✅ | No | N/A (EIDG add) |
| "Representative Details" header | ✅ | n/a | ❌ | n/a | ❌ |
| Representative Type dropdown | ✅ | Yes (`*`) | ✅ | ⚠️ No `required` | ⚠️ Required not enforced |
| Relationship Type dropdown | ✅ (Personal Rep) | Yes (`*`) | ✅ (Personal Rep) | ⚠️ No `required` | ⚠️ |
| Name (Legal Rep lookup) | ✅ | Yes | ❌ | — | ❌ Gap |
| Name (Guardian/others text) | ✅ | Yes | ❌ | — | ❌ Gap |
| Caller Phone (Guardian path) | ✅ | Yes | ❌ | — | ❌ Gap |
| Auth Type (read-only) | ✅ (Personal Rep paths) | No | ❌ | — | ❌ Gap |
| Start Date (read-only) | ✅ (some rel types) | No | ❌ | — | ❌ Gap |
| End Date (date picker) | ✅ (some rel types) | No | ❌ | — | ❌ Gap |
| Description textarea | ❌ | — | ✅ | No | No EPlus equivalent |
| Cancel / Close button | ✅ `× Cancel` (blue, body) | n/a | ✅ `Close` (neutral, footer) | n/a | ⚠️ Label/placement/style |
| Verify button | ✅ Always (phase 2) | n/a | ✅ Always | n/a | ✅ |

### 4.3 Provider Verification — Field-by-Field Rendering Table

| Field | EPlus (all origins) | EPlus (phone origins only) | Genesys LWC | Match? |
|---|---|---|---|---|
| Interaction banner | ✅ Always | — | ✅ Always | ✅ |
| `Case Origin *` dropdown | ✅ Required | — | ✅ Required | ✅ (label asterisk position differs — cosmetic) |
| Provider Name checkbox | ❌ Not shown | ✅ | ✅ (always shown) | ❌ LWC always shows; EPlus phone-gated |
| Provider ID checkbox | ❌ Not shown | ✅ | ✅ (always shown) | ❌ LWC always shows |
| Provider TIN checkbox | ❌ Not shown | ✅ | ✅ (always shown) | ❌ LWC always shows |
| Provider Contact # checkbox | ❌ Not shown | ✅ (label: `Provider Contact #`) | ✅ (label: `Phone Number`) | ❌ Label mismatch + always shown |
| `* Provider NPI` checkbox | ❌ Not shown | ✅ Required when data present | ✅ (label: `NPI`) | ❌ LWC always shows; label minor diff |
| Address checkbox | ❌ Not shown | ✅ | ✅ | ❌ LWC always shows |
| Provider Status checkbox | ❌ Not in EPlus | ❌ Not in EPlus | ✅ Present in LWC | ❌ Extra field in LWC |
| "Are you calling on behalf?" checkbox | ❌ Not shown | ✅ | ✅ (always shown) | ❌ LWC always shows; EPlus phone-gated |
| `* Caller Name:` | ❌ Not shown | ✅ Inside "on behalf" block, required | ✅ Always visible, top-level (EIDG add) | N/A — intentional |
| `Caller Type` combobox | ❌ Not shown | ✅ Inside "on behalf" block | ✅ Inside "on behalf" block | ✅ Structure matches |
| `Phone Number:` | ❌ Not shown | ✅ Inside "on behalf" block | ✅ Always visible, top-level (EIDG add) | N/A — intentional |
| `Phone Extension:` | ❌ Not shown | ✅ Inside "on behalf" block | ✅ Inside "on behalf" block | ✅ Structure matches |
| `× Cancel` button | ✅ Blue, modal body | — | ✅ `Close`, neutral, modal footer | ⚠️ Style + placement |
| `✓ Verify` button | ✅ Blue, always | — | ✅ Always | ✅ |

---

## 5. Cross-Check Log — Member Provider Search.docx

| Image | EPlus State | Genesys State | Key Observations |
|---|---|---|---|
| image1 | Non-Member, no Rep Type selected | Non-Member, no Rep Type selected | EPlus: no Caller Name/Phone, section headers, no label prefixes |
| image2 | (same state) | (same state, Genesys) | Genesys: has Caller Name/Phone (Body 1), label prefixes, Address bug ("undefined") |
| image3 | Non-Member, Legal Rep selected | Non-Member, Legal Rep selected | EPlus: `* Name` lookup (disabled). Genesys: Description textarea |
| image4 | (same state) | (same state, Genesys) | Genesys: Description only. Name lookup absent. |
| image5 | Non-Member, Personal Rep, Rel Type dropdown open | Non-Member, Personal Rep, Rel Type dropdown open | Dropdown options match exactly. EPlus placeholder: "Select Relationship Type" |
| image6 | (same state) | (same state, Genesys) | Confirms matching options. |
| image7 | Non-Member, Personal Rep, Rel = Parent | Non-Member, Personal Rep, Rel = Parent | EPlus: `* Parent` lookup + `Auth Type`. Genesys: Description only. |
| image8 | (same state) | (same state, Genesys) | Genesys: Description. No Parent lookup. No Auth Type. |
| image9 | Non-Member, Personal Rep, Rel = Guardian | Non-Member, Personal Rep, Rel = Guardian | EPlus: Name, Caller Phone, Auth Type, Start Date, End Date. Genesys: Description. |
| image10 | (same state) | (same state, Genesys) | Genesys: Description. Five EPlus fields absent. |

---

## 6. Implementation Notes & Scope Discussion

### 6.1 Straightforward Changes (Low Complexity)

- **M-P1-03** — Update "Close" → "← Go Back" label/icon in phase 1
- **M-P1-07** — Update interaction banner text to "Interaction Number is: Int-XXXXX"
- **M-P1-04, M-P1-05** — Align Walk-In and Meeting – Virtual label text to match EPlus
- **M-P2-01, M-P2-02** — Add "Member Details" and "Representative Details" section headers
- **M-P2-03** — Remove label prefixes from data column (show raw values only)
- **M-P2-10** — Change Rep Type placeholder from "Select an Option" → "Select Representative Type"
- **M-P2-11, M-P2-12** — Add `required` attribute to Representative Type and Relationship Type comboboxes

### 6.2 Moderate Changes

- **M-P2-04** — Render phone number as `<a href="tel:...">` hyperlink
- **M-P2-05** — Add country to mailing address display
- **M-P2-06** — Change DOB format to M/D/YYYY (strip leading zeros)
- **M-P2-17** — Add inline validation pattern to match EPlus ("Complete this field." beneath the field)
- **M-P2-18** — Evaluate moving Cancel button into modal body with matching blue style

### 6.3 Critical Bug Fix Required

- **M-P1-02** — `checkSelectionsAndDisplayVerification()` currently requires BOTH `caseOriginValue` AND `memberTypeValue`. Non-phone Case Origins never set `memberTypeValue`, so verification can never complete for those origins. **Fix needed:** For non-phone origins, trigger proceed to verification on Case Origin alone, without requiring Member Type.

### 6.4 Scope Discussion Items (Complex — need COA decision)

**M-P2-13/14/15 — EPlus authorized representative lookups:**

EPlus surfaces existing authorized representative records (object and field API names unknown) when certain Representative Types and Relationship Types are selected. Replicating this requires:
1. Identifying the EPlus managed package object that stores authorized representative records
2. Building an Apex query to fetch relevant records by member ID
3. Adding a combobox/lookup component to the LWC

COA should decide: replicate the Name lookup behavior, or keep Description textarea as the CSR's notes field for representatives?

**M-P2-15 — Auth Type, Start Date, End Date:**

These read-only / editable fields are driven by the EPlus-managed authorization record. Field API names are unknown. May require EIDG to query EPlus custom objects.

**M-P2-19 — Description textarea:**

EPlus has no equivalent. If COA wants to remove it for parity, or keep it as an EIDG-added data capture field.

---

### 6.6 Provider Verification — Straightforward Changes (Low Complexity)

- **P-02** — Rename checkbox label `Phone Number` → `Provider Contact #` in `providerVerificationModal.html`
- **P-04** — Reorder checkboxes to match EPlus sequence: Provider Name → Provider ID → Provider TIN → Provider Contact # → Provider NPI → Address
- **P-05** — Cosmetic only; `Case Origin *` asterisk position is an EPlus internal styling difference between the two modals. No change needed in our LWC (SLDS `required` convention is consistent and correct).
- **P-09** — Evaluate moving Close button to modal body and styling blue to match EPlus. Low priority cosmetic.
- **P-14** — Update interaction banner text to `Interaction Number is: Int-XXXXX` to match EPlus wording.

### 6.7 Provider Verification — Critical Bug Fix Required

- **P-01** — `providerVerificationModal.html` currently renders all checkboxes and the "Are you calling on behalf of a provider?" checkbox regardless of Case Origin. **Fix needed:** Gate these sections behind a phone-origin check, exactly as EPlus does. Non-phone origins (Email, Voice Mail, Research, Meeting – Virtual, Meeting – In Person) should show only Case Origin + Cancel + Verify. This is a rendering correctness bug equivalent to Member's M-P1-02.

- **P-06, P-07, P-08** — `providerVerificationModal.js` Case Origin option values are wrong for Voice Mail, Meeting – Virtual, and Meeting – In Person. Both the `label` and `value` properties must be corrected simultaneously. Stored value mismatch = data integrity issue in reports and automation. **Fix:**
  - `{ label: 'Voicemail', value: 'Voicemail' }` → `{ label: 'Voice Mail', value: 'Voice Mail' }`
  - `{ label: 'Meeting - Virtual', value: 'Meeting - Virtual' }` → `{ label: 'Meeting \u2013 Virtual', value: 'Meeting \u2013 Virtual' }`
  - `{ label: 'Meeting - In Person', value: 'Meeting - In Person' }` → `{ label: 'Meeting \u2013 In Person', value: 'Meeting \u2013 In Person' }`

### 6.8 Provider Verification — Scope Discussion Items (need COA decision)

**P-03 — Provider Status checkbox:**

EPlus does not include Provider Status as a verifiable attribute. Our LWC has it. Options:
1. Remove it for parity with EPlus.
2. Keep it as an EIDG-added verification point (analogous to keeping Caller Name/Phone despite EPlus not having them).

COA should decide whether Provider Status is a meaningful data point worth capturing at verification time. If kept, the `UST_EPLUS__Verification_Information__c` object must have a field to persist it, otherwise the checkbox is display-only.

**P-12 — Caller Type dropdown options:**

Caller Type options in EPlus are unconfirmed (dropdown was not opened in available screenshots). Our LWC has: Billing Office, Provider/Clinical Office, Hospital Staff/Facility, Other. These need to be verified against EPlus before release — a single additional screenshot with the dropdown open is all that's needed.

**P-17 — "Provider Details" section header:**

Whether EPlus shows a `Provider Details` section header (equivalent to Member's `Member Details` + ⓘ icon) above the checkbox group is unconfirmed from available screenshots. A single screenshot is needed to resolve this before implementing or omitting the header in our LWC.

### 6.5 Files That Will Need Changes

| File | Changes Anticipated |
|---|---|
| `memberVerificationModal.html` | Section headers, label removal, date format, button label/placement, Rep Type placeholder |
| `memberVerificationModal.js` | `checkSelectionsAndDisplayVerification()` non-phone fix (M-P1-02); DOB format; `required` on comboboxes; possibly new lookup fields |
| `verifyMember.html` | Phase 1 layout if we move to sequential Case Origin → Member Type |
| `providerVerificationModal.js` | Phone/non-phone gate (P-01); fix Case Origin options: "Voice Mail" value (P-06), "Meeting – Virtual" em dash (P-07), "Meeting – In Person" em dash (P-08); fix checkbox label "Provider Contact #" (P-02); remove "Provider Status" option or flag for COA decision (P-03); reorder checkboxes to match EPlus (P-04) |
| `providerVerificationModal.html` | Gate verification checkboxes + "on behalf" section behind phone origin check (P-01); fix phone number to render as hyperlink (P-16); update interaction banner text (P-14) |

---

## 7. Observation Log

| Date | Session | Source | Observations | Sections Populated/Updated |
|---|---|---|---|---|
| 2026-03-25 | Screenshot analysis session | `Member Provider Search.docx` (10 images) | Full Non-Member phase 2 path. 5 EPlus states, 5 Genesys states. Gaps M-P2-01 through M-P2-19 identified. | §1.2, §1.4, §1.5, §1.6, §3.2, §4.2, §5 |
| 2026-03-25 | Live sandbox screenshots from Jason | Sandbox — Phase 1 (all Case Origins) | Full phase 1 confirmed. Case Origin options confirmed. Phone vs. non-phone conditional logic confirmed. Go Back button confirmed. | §1.1, §1.3, §3.1, §4.1 |
| 2026-03-25 | Live sandbox screenshot from Jason | Sandbox — Non-Member phase 2 (Brandon Testing record) | Phase 2 Non-Member confirmed with real sandbox data. Disabled checkboxes when data absent. Asterisks only when field populated. Cancel/Verify button both blue. | §1.2, §1.4 refined |
| 2026-03-25 | Live sandbox screenshots from Jason | Sandbox — Legal Rep + Personal Rep initial states | Legal Rep Name lookup confirmed disabled (data-driven). Personal Rep Relationship Type field confirmed. Inline validation "Please Select Relationship Type" confirmed. | §1.5, §1.6 |
| 2026-03-25 | Live sandbox screenshots from Jason | Sandbox — All 7 Relationship Types under Personal Rep | All 7 Relationship Types fully documented. Parent = lookup + Auth Type only. Guardian/County DHS/POA/Advocate/Legal Rep/Other = identical (Name text, Caller Phone, Description, Auth Type, Start Date read-only today, End Date picker today). Full field matrix confirmed. | §1.6, §1.6.4, §1.6.5 |
| 2026-03-25 | Live sandbox screenshot from Jason | Sandbox — Member standard path (Brandon Testing, Int-171617) | Member path = Member Details only. No Representative Details section. No conditional rendering. Cancel + Verify both visible immediately. Confirmed no gaps on the Member path beyond M-P2-01 (section header) and button label. | §1.8 |
| 2026-03-25 | Live sandbox screenshots from Jason | Sandbox — Provider workflow, all 7 Case Origins | Provider modal structure confirmed. 7 Case Origins documented. Phone vs. non-phone gate confirmed (checkboxes + on-behalf only for Inbound/Outbound). All 6 checkbox labels and values documented. "Are you calling on behalf?" unchecked and checked states confirmed for both Inbound and Outbound. No additional conditional rendering found (Jason confirmed). | §2, §3.3, §4.3, §6.5 |
| _TBD_ | Sandbox — Verify button behavior (both Member and Provider) | Sandbox | Min checkbox count, error messages, success navigation | §1.7, §2.5 |
| _TBD_ | Sandbox — Caller Type dropdown options (Provider) | Sandbox | Open Caller Type combobox and capture all options | §2.4, P-12 |

---

## 8. Outstanding Sandbox Exploration Required

### Member Workflow
1. **Member (standard) path** — Phase 2 when Member Type = Member. What fields appear? Is Representative Details hidden?
2. **Verify button behavior** — Minimum checkbox count EPlus requires. Error message for insufficient checkboxes. Success behavior (navigation/toast/modal close).
3. **Legal Rep "Select Name" interaction** — Can the lookup be used? What records does it search?
4. **County DHS / POA / Advocate / Legal Rep / Other** relationship types — Confirm Guardian pattern applies to all.
5. **Walk-In / non-phone origins full path** — Confirm what "Verify" does from phase 1 with no checkboxes (direct record creation?).

### Provider Workflow
1. **Verify button behavior** — Minimum checkbox count EPlus requires (0? 1? 2?). Error message text. Success behavior (navigation/toast/modal close).
2. **Caller Type dropdown options** — Open the Caller Type combobox inside the "on behalf" section and capture all available options. Our LWC has: Billing Office, Provider/Clinical Office, Hospital Staff/Facility, Other — need to confirm these match EPlus.
3. **Provider Status checkbox** — Confirm definitively not present in EPlus (already appears so from screenshots; confirm with a second provider record if possible).
4. **Non-phone origin Verify** — Confirm what happens when Verify is clicked with only Case Origin selected for a non-phone origin (direct record creation, no checkboxes required?).
