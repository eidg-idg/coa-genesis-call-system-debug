# Conditional Rendering Parity — Development Plan

## Initiative Overview

This is the second body of work by **EIDG** (consulting developers) for Colorado Access (COA). The first body of work — documented in `dev/devArchive/genesysCodeRemPlan.md` — addressed remediation of the Genesys CTI screen pop verification code. This new initiative builds directly on that prior work.

Neither body of work has been deployed to production yet. At the conclusion of this effort, both will be QA'd, UAT'd, deployed, and tested with the client's cooperation as a combined release.

### Goal

The specific goal is to make the user experience and conditional rendering identical for the human user regardless of whether they are using the **Genesys screen pop workflow** (COA-owned code) or the **manual verification process** (EPlus managed package). Currently, these two paths are not aligned — the fields displayed, the order of operations, and the conditional rendering logic differ between the two workflows, creating an inconsistent experience for CSRs.

### Challenge

COA does not own or have access to the EPlus managed package source code. The managed package controls the manual verification workflow, and its internal logic is opaque. To achieve parity, we are **reverse engineering the EPlus workflow behavior** — observing its runtime output, field visibility rules, and conditional rendering — so that we can emulate it accurately in the code we do own (the Genesys CTI screen pop path, including our Apex controllers, Visualforce pages, and Lightning Web Components).

This means all implementation decisions must be validated against the observable behavior of the EPlus workflow, not against assumptions about how it works internally.

### Access & Deployment Model

- **Production access:** EIDG does not have direct access to the client's production Salesforce instance due to geographical constraints (Portugal) and the presence of PII/PHI. The client's team will manage all production deployments.
- **Sandbox access:** EIDG has access to the Genesys sandbox (`coaGenesys`), which will be used for hands-on scoping, development, QA, and UAT.
- **Development execution:** All development is executed by EIDG.
- **Final deliverables** will include:
  - Complete, tested code changes
  - Deployment instructions for the client's team
  - A **file manifest** of all components to deploy
  - A **draft change set** specification

### Reverse Engineering Approach

The EPlus workflow findings are documented in `dev/currentDev/EPlus-Verify-Reverse-Engineer.md`, produced through direct observation of the EPlus managed package behavior in the sandbox environment. That document serves as the requirements baseline for all implementation work in this plan.

### Reference Key

- **RE doc** = `dev/currentDev/EPlus-Verify-Reverse-Engineer.md`
- **Member modal JS** = `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.js`
- **Member modal HTML** = `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.html`
- **Member modal CSS** = `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.css`
- **Provider modal JS** = `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.js`
- **Provider modal HTML** = `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.html`
- **Provider modal CSS** = `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.css`
- **Verify Member JS** = `force-app/main/default/lwc/verifyMember/verifyMember.js`
- **Verify Member HTML** = `force-app/main/default/lwc/verifyMember/verifyMember.html`
- **Verify Provider JS** = `force-app/main/default/lwc/verifyProvider/verifyProvider.js`
- **Verify Provider HTML** = `force-app/main/default/lwc/verifyProvider/verifyProvider.html`

---

## Implementation Items

Each item below maps to one or more gaps from the RE doc gap analysis (§3). Items are grouped by component and ordered by priority within each group. Each item includes the exact files, line numbers, and code changes required.

---

## GROUP A — Member Verification Modal (Critical Behavioral Gaps)

### A-1. Phone/Non-Phone Gate for Member Type Dropdown

**RE doc ref:** M-P1-02 (Critical), §1.1.3
**Priority:** HIGH — Current LWC blocks non-phone paths from completing verification.

**Problem:** `memberVerificationModal.html` lines 19–24 always render the Member Type combobox. `checkSelectionsAndDisplayVerification()` at `memberVerificationModal.js` line 181–186 requires BOTH `caseOriginValue` AND `memberTypeValue` to advance to phase 2. Non-phone Case Origins (Chat, Walk-In, Research, Transfer, Email, Fax, Voice Mail, Mail, Meeting – Virtual) can never set `memberTypeValue`, so the CSR is permanently stuck in phase 1.

**EPlus behavior:** Member Type dropdown only appears for `Inbound - Phone Call` and `Outbound - Phone Call`. For all other origins, a Verify button appears immediately in phase 1, and clicking it creates a verification record with only Case Origin populated — no checkboxes, no phase 2.

**Implementation steps:**

1. **Add a computed property** in `memberVerificationModal.js` after `caseOriginOptions` getter (after line 47):

   ```js
   get isPhoneOrigin() {
       return this.caseOriginValue === 'Inbound - Phone Call' ||
              this.caseOriginValue === 'Outbound - Phone Call';
   }
   ```

2. **Add a computed property** for showing the phase 1 Verify button (non-phone origins only):

   ```js
   get showPhaseOneVerify() {
       return this.caseOriginValue && !this.isPhoneOrigin;
   }
   ```

3. **Conditionally render Member Type** in `memberVerificationModal.html` lines 19–24. Wrap the Member Type combobox in `<template if:true={isPhoneOrigin}>`:

   ```html
   <template if:true={isPhoneOrigin}>
       <lightning-combobox name="memberType"
                           label="Member Type"
                           value={memberTypeValue}
                           options={memberTypeOptions}
                           required
                           onchange={handleMemberTypeChange}>
       </lightning-combobox>
   </template>
   ```

4. **Add a phase 1 Verify button** in `memberVerificationModal.html` inside the `showDropdowns` block (after the Member Type combobox template, before the closing `</template>` of `showDropdowns`):

   ```html
   <template if:true={showPhaseOneVerify}>
       <div class="slds-grid slds-grid_align-center slds-m-top_medium">
           <lightning-button label="Verify" variant="brand"
                             icon-name="utility:check"
                             onclick={verifyPhaseOne}
                             disabled={isSaving}>
           </lightning-button>
       </div>
   </template>
   ```

5. **Add `verifyPhaseOne()` handler** in `memberVerificationModal.js`. This method creates a lightweight verification record with only Case Origin (no checkboxes, no caller details):

   > **Dependency: D-6.** The field values passed for `callerName` and `callerPhone` below depend on the COA decision in D-6 (Member non-phone caller name behavior). If `UST_EPLUS__Caller_Name__c` is required at the object/validation-rule level, passing empty string will cause a DML error. The implementation below assumes Option A (EPlus parity — no caller name). If COA chooses Option B or C, this method must be updated to collect and pass caller identity fields.

   ```js
   verifyPhaseOne() {
       const recordId = this.extractRecordId(this.account);
       if (!recordId) {
           this.errorMessage = "Unable to identify the member record.";
           return;
       }
       this.masterAccountId = recordId;
       // D-6 dependency: callerName/callerPhone values depend on COA decision
       const verificationData = {
           interactionId: this.interactionId,
           callerName: '',
           accountId: this.masterAccountId,
           caseOrigin: this.caseOriginValue,
           representativeType: '',
           callerPhone: '',
       };
       this.isSaving = true;
       this.errorMessage = '';
       this.createVerificationRecord(verificationData);
   }
   ```

   **Note:** `createVerificationRecord()` reads field values from the `data` parameter, not from component state like `this.checkedValues`. No checkbox fields are written to the record. However, ensure that `createVerificationRecord()` does not reference any checkbox-derived state — if future changes add checkbox persistence, pass `checkedValues: []` explicitly.

6. **Update `checkSelectionsAndDisplayVerification()`** at `memberVerificationModal.js` line 181–186 to only advance for phone origins:

   ```js
   checkSelectionsAndDisplayVerification() {
       if (this.caseOriginValue && this.isPhoneOrigin && this.memberTypeValue) {
           this.showDropdowns = false;
           this.showVerificationSection = true;
       }
   }
   ```

7. **Update `handleCaseOriginChange()`** at line 148–151. When a non-phone origin is selected after a phone origin was previously selected, reset Member Type and re-show dropdowns:

   ```js
   handleCaseOriginChange(event) {
       this.caseOriginValue = event.detail.value;
       if (!this.isPhoneOrigin) {
           this.memberTypeValue = '';
           this.showRepresentativeDetails = false;
       }
       this.checkSelectionsAndDisplayVerification();
   }
   ```

---

### A-2. Interaction Banner Text Parity

**RE doc ref:** M-P1-07, P-14
**Priority:** LOW

**Problem:** `memberVerificationModal.html` line 6 and `providerVerificationModal.html` line 6 display `Interaction: {interactionName}`. EPlus displays `Interaction Number is: Int-XXXXXXXXX`. Additionally, EPlus only shows the banner when a linked interaction exists; our LWC always renders it.

**Implementation steps:**

1. In `memberVerificationModal.html`, wrap the banner div (lines 5–7) in a conditional and update the text:
   ```html
   <template if:true={interactionName}>
       <div class="interaction-name-display slds-m-around_medium slds-align_absolute-center">
           <p><b>Interaction Number is:</b> {interactionName}</p>
       </div>
   </template>
   ```

2. Same change in `providerVerificationModal.html` lines 5–7.

---

### A-3. Case Origin Label Cosmetic Fixes (Walk-In, Meeting – Virtual)

**RE doc ref:** M-P1-04, M-P1-05
**Priority:** LOW

**Problem:** `memberVerificationModal.js` lines 38 and 45 — `Walk In` label (should be `Walk-In`) and `Meeting - Virtual` label (should use em dash `Meeting – Virtual`).

**Implementation steps:**

1. In `memberVerificationModal.js` line 38, change label from `'Walk In'` to `'Walk-In'`.
2. In `memberVerificationModal.js` line 45, change label from `'Meeting - Virtual'` to `'Meeting – Virtual'`.

---

### A-4. Member Details Section Header

**RE doc ref:** M-P2-01
**Priority:** MEDIUM

**Problem:** `memberVerificationModal.html` has no section header above the verification checkboxes (line 29 starts the grid immediately). EPlus displays a bold `Member Details` header with an info icon.

**Implementation steps:**

1. In `memberVerificationModal.html`, immediately before the `<div class="slds-grid slds-wrap">` on line 29, insert:

   ```html
   <div class="slds-m-bottom_small section-header">
       <span class="slds-text-heading_small slds-text-title_bold">Member Details</span>
       <lightning-icon icon-name="utility:info" size="xx-small"
                       alternative-text="Info" class="slds-m-left_xx-small">
       </lightning-icon>
   </div>
   ```

2. Add CSS in `memberVerificationModal.css`:

   ```css
   .section-header {
       display: flex;
       align-items: center;
   }
   ```

---

### A-5. Remove Bold Label Prefixes from Data Column

**RE doc ref:** M-P2-03
**Priority:** MEDIUM

**Problem:** `memberVerificationModal.html` lines 56–64 display data with bold label prefixes (`<b>Member Id:</b>`, `<b>SSN:</b>`, etc.). EPlus shows raw values only — labels are in the checkbox column.

**Implementation steps:**

1. In `memberVerificationModal.html`, replace lines 56–64:

   Current:
   ```html
   <p><b>Member Id:</b> {account.MemberID}</p>
   <p><b>SSN:</b> {account.ssn}</p>
   <p><b>Member Name:</b> {account.Name}</p>
   <p><b>DOB:</b> {formattedDateOfBirth}</p>
   <p><b>Phone:</b> {formattedPhoneNumber}</p>
   <div>
       <p><b>Mailing Address:</b></p>
       <pre>{fullMailingAddress}</pre>
   </div>
   ```

   Replace with:
   ```html
   <p class="data-value">{account.MemberID}</p>
   <p class="data-value">{account.ssn}</p>
   <p class="data-value">{account.Name}</p>
   <p class="data-value">{formattedDateOfBirth}</p>
   <p class="data-value">
       <a href={phoneTelLink} class="phone-link">{formattedPhoneNumber}</a>
   </p>
   <div class="data-value">
       <pre>{fullMailingAddress}</pre>
   </div>
   ```

2. Add `phoneTelLink` getter in `memberVerificationModal.js`:

   ```js
   get phoneTelLink() {
       if (this.account && this.account.Phone) {
           const digits = this.account.Phone.replace(/\D/g, '');
           return digits.length >= 10 ? `tel:+1${digits}` : '#';
       }
       return '#';
   }
   ```

3. Add CSS in `memberVerificationModal.css`:

   ```css
   .data-value {
       min-height: 22px; /* maintains row alignment with checkboxes */
   }

   .phone-link {
       color: #0070d2;
       text-decoration: none;
   }
   .phone-link:hover {
       text-decoration: underline;
   }
   ```

**Note:** This also addresses M-P2-04 (phone as blue hyperlink).

---

### A-6. Date of Birth Format: M/D/YYYY (No Zero-Padding)

**RE doc ref:** M-P2-06
**Priority:** LOW

**Problem:** `memberVerificationModal.js` lines 124–138 — `formattedDateOfBirth` getter uses zero-padded format `MM/DD/YYYY`. EPlus uses `M/D/YYYY` (no zero-padding, e.g. `6/25/2020`).

**Implementation steps:**

1. In `memberVerificationModal.js`, modify the `formattedDateOfBirth` getter. Where month and day are constructed, remove `.padStart(2, '0')`:

   Current (line 133):
   ```js
   const day = dateParts[2].padStart(2, '0');
   ```

   Replace with:
   ```js
   const day = dateParts[2];
   ```

   And change month mapping to return integers instead of zero-padded strings:
   ```js
   const months = {
       January: '1', February: '2', March: '3', April: '4',
       May: '5', June: '6', July: '7', August: '8',
       September: '9', October: '10', November: '11', December: '12'
   };
   ```

2. Also update `verifyMember.js` `formatDateOfBirth()` at lines 49–57 to match:

   ```js
   formatDateOfBirth(dob) {
       if (dob) {
           const date = new Date(dob);
           const month = (date.getMonth() + 1).toString();
           const day = date.getDate().toString();
           const year = date.getFullYear();
           return `${month}/${day}/${year}`;
       }
       return '';
   }
   ```

---

### A-7. Mailing Address: Include Country

**RE doc ref:** M-P2-05
**Priority:** LOW

**Problem:** `memberVerificationModal.js` `fullMailingAddress` getter (lines 80–83) does not include a country line. EPlus shows `US` as a third line.

**Implementation steps:**

1. In `memberVerificationModal.js`, update the `fullMailingAddress` getter:

   Current:
   ```js
   get fullMailingAddress() {
       const { MailingStreet, MailingCity, MailingState, MailingPostalCode } = this.account;
       return `${MailingStreet}\n${MailingCity}, ${MailingState} ${MailingPostalCode}`;
   }
   ```

   Replace with:
   ```js
   get fullMailingAddress() {
       const { MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry } = this.account;
       let address = `${MailingStreet}\n${MailingCity}, ${MailingState} ${MailingPostalCode}`;
       if (MailingCountry) {
           address += `\n${MailingCountry}`;
       }
       return address;
   }
   ```

2. **Data already available — no Apex changes needed.** `GC_Account_PageController.cls` line 26 already queries `PersonMailingCountry`, and `VerifyMemberVisualforcePage.page` line 28 already maps it to `MailingCountry` in the serialized JSON. The only change required is in the JS getter above.

---

### A-8. Representative Details Section Header

**RE doc ref:** M-P2-02
**Priority:** MEDIUM

**Problem:** `memberVerificationModal.html` line 88 shows the `showRepresentativeDetails` block with no section header. EPlus has a bold `Representative Details` header.

**Implementation steps:**

1. In `memberVerificationModal.html`, immediately after `<template if:true={showRepresentativeDetails}>` (line 88), before the `<div class="slds-m-around_medium">`, insert:

   ```html
   <div class="slds-m-around_medium section-header">
       <span class="slds-text-heading_small slds-text-title_bold">Representative Details</span>
   </div>
   ```

---

### A-9. Representative Type Placeholder Text and Required Attribute

**RE doc ref:** M-P2-10, M-P2-11
**Priority:** MEDIUM

**Problem:** `memberVerificationModal.html` line 90–95 — Representative Type combobox has no explicit `placeholder` attribute (defaults to SLDS default). EPlus uses `Select Representative Type`. Also, it is not marked `required` — EPlus requires it (`*`).

**Implementation steps:**

1. In `memberVerificationModal.html`, update the Representative Type combobox (lines 90–95):

   ```html
   <lightning-combobox name="representativeType"
                       label="Representative Type"
                       value={representativeTypeValue}
                       placeholder="Select Representative Type"
                       options={representativeTypeOptions}
                       required
                       onchange={handleRepresentativeTypeChange}>
   </lightning-combobox>
   ```

---

### A-10. Relationship Type Required Attribute

**RE doc ref:** M-P2-12
**Priority:** MEDIUM

**Problem:** `memberVerificationModal.html` line 101–106 — Relationship Type combobox is not marked `required`. EPlus requires it.

**Implementation steps:**

1. In `memberVerificationModal.html`, add `required` to the Relationship Type combobox:

   ```html
   <lightning-combobox name="relationshipType"
                       label="Relationship Type"
                       value={relationshipTypeValue}
                       placeholder="Select Relationship Type"
                       options={relationshipTypeOptions}
                       required
                       onchange={handleRelationshipTypeChange}>
   </lightning-combobox>
   ```

---

### A-11. Personal Representative — Expanded Field Set (Guardian and Non-Parent Paths)

**RE doc ref:** M-P2-15, M-P2-16
**Priority:** HIGH — Five fields entirely missing for Guardian/County DHS/POA/Advocate/Legal Rep/Other relationship types.

**Problem:** `memberVerificationModal.html` lines 112–121 only show a Description textarea for all representative types. EPlus shows `* Name`, `* Caller Phone`, `Description`, `Auth Type` (read-only), `Start Date` (read-only, today), and `End Date` (date picker, today) for Guardian and all other non-Parent relationship types.

**EPlus behavior per RE doc §1.6.4:**
- **Parent** → disabled lookup + Auth Type (read-only). See A-12 for scoping note.
- **Guardian, County DHS, POA, Advocate, Legal Rep, Other** → `* Name` (text), `* Caller Phone` (text), `Description` (textarea), `Auth Type` (read-only = "Personal Representative"), `Start Date` (read-only = today), `End Date` (date picker, default today).

**Implementation steps:**

1. **Add computed properties** in `memberVerificationModal.js`:

   ```js
   get isParentRelationship() {
       return this.relationshipTypeValue === 'Parent';
   }

   get isNonParentPersonalRep() {
       return this.showRelationshipType &&
              this.relationshipTypeValue &&
              this.relationshipTypeValue !== 'Parent';
   }

   get todayDateString() {
       const today = new Date();
       const m = today.getMonth() + 1;
       const d = today.getDate();
       const y = today.getFullYear();
       return `${m}/${d}/${y}`;
   }
   ```

2. **Add tracked properties** in `memberVerificationModal.js` (near the other property declarations, around line 29):

   ```js
   repNameValue = '';
   repCallerPhoneValue = '';
   endDateValue = '';
   ```

3. **Add handlers** in `memberVerificationModal.js`:

   ```js
   handleRepNameChange(event) {
       this.repNameValue = event.target.value;
   }

   handleRepCallerPhoneChange(event) {
       this.repCallerPhoneValue = event.target.value;
   }

   handleEndDateChange(event) {
       this.endDateValue = event.target.value;
   }
   ```

4. **Initialize `endDateValue`** to today's date in ISO format in `connectedCallback()` (or in `handleRelationshipTypeChange`):

   ```js
   handleRelationshipTypeChange(event) {
       this.relationshipTypeValue = event.detail.value;
       if (!this.endDateValue) {
           this.endDateValue = new Date().toISOString().split('T')[0];
       }
   }
   ```

5. **Replace the Additional Fields template** in `memberVerificationModal.html` (lines 112–121). Replace the entire `showAdditionalFields` block:

   Current:
   ```html
   <template if:true={showAdditionalFields}>
       <div class="slds-m-around_medium">
           <lightning-textarea label="Description"
                               name="description"
                               value={descriptionValue}
                               onchange={handleDescriptionChange}
                               rows="3">
           </lightning-textarea>
       </div>
   </template>
   ```

   Replace with:
   ```html
   <!-- Parent Relationship — disabled lookup + Auth Type -->
   <template if:true={isParentRelationship}>
       <div class="slds-m-around_medium">
           <lightning-combobox name="parentLookup"
                               label="Parent"
                               placeholder="Select Name"
                               disabled
                               field-level-help="No authorized parent records on file for this member.">
           </lightning-combobox>
           <lightning-input label="Auth Type"
                           value="Personal Representative"
                           read-only
                           class="slds-m-top_small">
           </lightning-input>
       </div>
   </template>

   <!-- Non-Parent Personal Rep — full field set -->
   <template if:true={isNonParentPersonalRep}>
       <div class="slds-m-around_medium">
           <lightning-input label="Name"
                           name="repName"
                           value={repNameValue}
                           required
                           onchange={handleRepNameChange}>
           </lightning-input>
           <lightning-input label="Caller Phone"
                           name="repCallerPhone"
                           value={repCallerPhoneValue}
                           required
                           onchange={handleRepCallerPhoneChange}>
           </lightning-input>
           <lightning-textarea label="Description"
                               name="description"
                               value={descriptionValue}
                               onchange={handleDescriptionChange}
                               rows="3">
           </lightning-textarea>
           <lightning-input label="Auth Type"
                           value="Personal Representative"
                           read-only
                           class="slds-m-top_small">
           </lightning-input>
           <lightning-input label="Start Date"
                           value={todayDateString}
                           read-only
                           class="slds-m-top_small">
           </lightning-input>
           <lightning-input type="date"
                           label="End Date"
                           name="endDate"
                           value={endDateValue}
                           onchange={handleEndDateChange}
                           class="slds-m-top_small">
           </lightning-input>
       </div>
   </template>
   ```

6. **Remove the `showAdditionalFields` property and its toggle** from `memberVerificationModal.js`:
   - Remove `showAdditionalFields = false;` (line 26).
   - Remove `this.showAdditionalFields = true;` from `handleRepresentativeTypeChange()` (line 162).

7. **Reset representative fields** when Representative Type changes in `handleRepresentativeTypeChange()`:

   ```js
   handleRepresentativeTypeChange(event) {
       this.representativeTypeValue = event.detail.value;
       this.showRelationshipType = this.representativeTypeValue === 'Personal Representative';
       this.relationshipTypeValue = '';
       this.repNameValue = '';
       this.repCallerPhoneValue = '';
       this.descriptionValue = '';
   }
   ```

**Scoping note (from RE doc §1.6.5):** EPlus creates authorization records (writes to managed package objects) during verification for non-Parent relationship types. Replicating this would require write access to EPlus managed package objects. **This plan implements the UI fields only.** Authorization record creation is deferred as a separate scoping discussion with COA.

---

### A-12. Legal Representative — Name Lookup (Scoping Item)

**RE doc ref:** M-P2-13
**Priority:** HIGH (structural gap) — but **requires COA scoping decision**.

**Problem:** EPlus shows a `* Name` lookup field for Legal Representative that queries EPlus-managed authorized representative records. Our LWC shows a Description textarea.

**Current code:** `memberVerificationModal.js` line 162 — `handleRepresentativeTypeChange` sets `showAdditionalFields = true` which renders the Description textarea for ALL representative types.

**EPlus behavior:** Legal Representative → single `* Name` lookup (disabled when no auth rep records exist for the member). No Description, no other fields.

**Implementation steps:**

1. **Add computed property** in `memberVerificationModal.js`:

   ```js
   get isLegalRepresentative() {
       return this.representativeTypeValue === 'Legal Representative';
   }
   ```

2. **Add template for Legal Representative** in `memberVerificationModal.html`, inserted inside the `showRepresentativeDetails` block, after the Relationship Type combobox template:

   ```html
   <template if:true={isLegalRepresentative}>
       <div class="slds-m-around_medium">
           <lightning-combobox name="legalRepName"
                               label="Name"
                               placeholder="Select Name"
                               disabled
                               field-level-help="No authorized representative records on file for this member.">
           </lightning-combobox>
       </div>
   </template>
   ```

   The combobox is rendered as **disabled** because our code cannot query EPlus managed package authorized representative data. This matches the visual appearance CSRs see in the sandbox (where test members have no auth rep records).

3. **Scoping decision required:** To make this field functional, EIDG would need:
   - The API name of the EPlus object/relationship that stores authorized representatives
   - Read access to that object in the current profile/permission set
   - A custom Apex controller method to query authorized reps for a given Account
   - Wire the results into the combobox `options` property

   This is logged as a **deferred scope item** pending COA confirmation of feasibility.

---

### A-13. Inline Field Validation (Replace Banner Errors)

**RE doc ref:** M-P2-17
**Priority:** MEDIUM

**Problem:** `memberVerificationModal.js` `verify()` (lines 197–233) sets `this.errorMessage` which renders as a banner alert in `memberVerificationModal.html` lines 124–128. EPlus uses inline validation under each field (`"Complete this field."` in red text).

**Implementation steps:**

1. **Mark validatable inputs with `data-validate`** in the HTML templates. Add `data-validate` to every `lightning-combobox` and `lightning-input` that the CSR is expected to fill in (Case Origin, Member Type, Caller Name, Representative Type, Relationship Type, Rep Name, Rep Caller Phone). Do NOT add it to:
   - Checkboxes (`type="checkbox"`) — validated by count, not individually
   - Read-only fields (Auth Type, Start Date) — not user-editable
   - Disabled fields (Parent lookup, Legal Rep lookup) — not actionable

   Example for Caller Name:
   ```html
   <lightning-input label="Caller Name"
                    name="callerName"
                    value={nameValue}
                    required
                    data-validate
                    onchange={handleNameChange}>
   </lightning-input>
   ```

2. **Use `reportValidity()` scoped to `[data-validate]` elements only.** In `verify()` before the checkbox count check:

   ```js
   // Validate only user-editable required fields (not checkboxes, read-only, or disabled)
   const allValid = [...this.template.querySelectorAll('[data-validate]')]
       .reduce((valid, input) => {
           input.reportValidity();
           return valid && input.checkValidity();
       }, true);

   if (!allValid) {
       return;
   }
   ```

3. **Remove the manual `this.errorMessage` checks** for caller name (lines 207–210). The `required` attribute on the `lightning-input` for Caller Name handles this natively via SLDS inline validation.

4. **Keep the checkbox count error as a banner** — there is no SLDS inline validation pattern for "check at least N checkboxes":

   ```js
   if (this.checkedValues.length < 3) {
       this.errorMessage = "Please select at least three verification items.";
       return;
   }
   this.errorMessage = '';
   ```

5. Apply the same `[data-validate]` + `reportValidity()` pattern in `providerVerificationModal.js` `verify()` method.

---

### A-14. Cancel Button Parity (Label, Color, Placement)

**RE doc ref:** M-P1-03, M-P2-18
**Priority:** LOW

**Problem:** `verifyMember.html` line 64 shows a neutral-colored `Close` button in the modal footer. EPlus uses `← Go Back` (blue, in body) for phase 1 and `× Cancel` (blue, in body) for phase 2. Similarly for the provider modal.

**Implementation steps:**

1. **Phase 1 — Go Back button.** In `memberVerificationModal.html`, inside the `showDropdowns` block, add before the Verify button:

   ```html
   <div class="slds-grid slds-grid_align-center slds-m-top_medium">
       <lightning-button label="Go Back" variant="brand"
                         icon-name="utility:back"
                         onclick={handleGoBack}>
       </lightning-button>
   </div>
   ```

2. **Phase 2 — Cancel button.** In `memberVerificationModal.html`, update the button section at line 131–133. Add a Cancel button alongside Verify:

   ```html
   <div class="slds-grid slds-grid_align-center slds-m-top_medium">
       <lightning-button label="Cancel" variant="brand"
                         icon-name="utility:close"
                         onclick={handleCancel}
                         class="slds-m-right_small">
       </lightning-button>
       <lightning-button label={verifyButtonLabel} variant="brand"
                         icon-name="utility:check"
                         onclick={verify}
                         disabled={isSaving}>
       </lightning-button>
   </div>
   ```

3. **Add handlers** in `memberVerificationModal.js`:

   ```js
   handleGoBack() {
       this.dispatchEvent(new CustomEvent('close'));
   }

   handleCancel() {
       this.dispatchEvent(new CustomEvent('close'));
   }
   ```

4. **Remove the footer Close button** from `verifyMember.html` lines 63–65:

   ```html
   <!-- Remove this entire footer block -->
   <footer class="slds-modal__footer">
       <lightning-button variant="neutral" label="Close" title="Close" onclick={handleModalClose}></lightning-button>
   </footer>
   ```

   Replace with an empty footer or remove entirely (the close actions are now in the modal body via Go Back / Cancel).

5. Apply the same pattern for `verifyProvider.html` lines 65–67 (replace footer Close with Cancel in the modal body).

---

## GROUP B — Provider Verification Modal (Critical Behavioral Gaps)

### B-1. Phone/Non-Phone Conditional Gate

**RE doc ref:** P-01 (Critical), P-18, §2.2
**Priority:** HIGH — All verification fields are currently shown for all Case Origins. EPlus only shows them for phone origins.

**Problem:** `providerVerificationModal.html` lines 22–63 (checkboxes), 66–78 (caller fields), 81–86 (on-behalf checkbox) are always rendered. EPlus hides all of these for non-phone origins, showing only Case Origin + Cancel/Verify.

**Implementation steps:**

1. **Add a computed property** in `providerVerificationModal.js` (after `caseOriginOptions` getter, line 37):

   ```js
   get isPhoneOrigin() {
       return this.caseOriginValue === 'Inbound - Phone Call' ||
              this.caseOriginValue === 'Outbound - Phone Call';
   }
   ```

2. **Wrap the verification checkboxes section** in `providerVerificationModal.html`. Wrap lines 22–63 (the `slds-grid slds-gutters` div containing both checkbox and data columns) in:

   ```html
   <template if:true={isPhoneOrigin}>
       <!-- existing checkbox grid from lines 22–63 -->
   </template>
   ```

3. **Wrap the caller information section** (lines 66–78) in:

   ```html
   <template if:true={isPhoneOrigin}>
       <!-- existing caller name + phone inputs -->
   </template>
   ```

4. **Wrap the "on behalf" checkbox and conditional fields** (lines 81–104) in:

   ```html
   <template if:true={isPhoneOrigin}>
       <!-- existing on-behalf checkbox + conditional fields -->
   </template>
   ```

5. **Update `verify()` method** in `providerVerificationModal.js` (lines 135–170). For non-phone origins, skip caller name validation and checkbox count validation.

   > **Dependency: D-6.** The non-phone path passes empty `callerName`/`callerPhone`. This is EPlus parity (Option A from D-6). If `UST_EPLUS__Caller_Name__c` is required at the object level, this will fail. Same decision as Member non-phone — see D-6 for options. The Provider modal already has Caller Name gated behind `isPhoneOrigin` (Body 1 design keeps it always-visible for phone, hidden for non-phone per RE doc P-01). This explicitly implements P-18 (RE doc §3.3) — non-phone origins bypass caller name validation.

   ```js
   verify() {
       if (!this.caseOriginValue) {
           this.errorMessage = 'Please select a Case Origin before verifying.';
           return;
       }

       // Phone origins require full verification (P-01 gate + P-18 bypass)
       if (this.isPhoneOrigin) {
           if (!this.callerName || this.callerName.trim() === '') {
               this.errorMessage = 'Caller Name is required.';
               return;
           }

           if (this.checkedValues.length < 2) {
               this.errorMessage = "Please select at least two verification options to proceed.";
               return;
           }
       }

       // D-6 dependency: callerName/callerPhone empty for non-phone (Option A)
       const verificationData = {
           interactionId: this.interactionId,
           providerId: this.providerId,
           caseOrigin: this.caseOriginValue,
           callerName: this.isPhoneOrigin ? this.callerName : '',
           callerPhone: this.isPhoneOrigin ? this.callerPhoneNumber : '',
       };

       this.isSaving = true;
       this.errorMessage = '';
       this.createVerificationRecord(verificationData);
   }
   ```

6. **Reset state on Case Origin change** — update `handleCaseOriginChange` at line 118–120:

   ```js
   handleCaseOriginChange(event) {
       this.caseOriginValue = event.detail.value;
       if (!this.isPhoneOrigin) {
           this.checkedValues = [];
           this.isCallingOnBehalf = false;
           this.errorMessage = '';
       }
   }
   ```

---

### B-2. Case Origin Value Mismatches (Voice Mail, Meeting – Virtual, Meeting – In Person)

**RE doc ref:** P-06, P-07, P-08 (all HIGH)
**Priority:** HIGH — Stored value mismatches cause data integrity issues. Reports/filters on `Case Origin = 'Voice Mail'` won't match records saved as `'Voicemail'`.

**Problem:** `providerVerificationModal.js` lines 32–35:
- Line 32: `{ label: 'Voicemail', value: 'Voicemail' }` — should be `Voice Mail` (two words)
- Line 34: `{ label: 'Meeting - Virtual', value: 'Meeting - Virtual' }` — should use em dash `–`
- Line 35: `{ label: 'Meeting - In Person', value: 'Meeting - In Person' }` — should use em dash `–`

**Implementation steps:**

1. In `providerVerificationModal.js`, replace lines 32–35 of `caseOriginOptions`:

   ```js
   { label: 'Voice Mail', value: 'Voice Mail' },
   { label: 'Research', value: 'Research' },
   { label: 'Meeting – Virtual', value: 'Meeting – Virtual' },
   { label: 'Meeting – In Person', value: 'Meeting – In Person' }
   ```

   Use actual em dash character `–` (Unicode U+2013), NOT a regular hyphen `-`.

---

### B-3. Checkbox Label: "Provider Contact #" and Checkbox Order

**RE doc ref:** P-02, P-04
**Priority:** MEDIUM

**Problem:** `providerVerificationModal.js` line 69 uses label `'Phone Number'`. EPlus uses `'Provider Contact #'`. Additionally, checkbox order doesn't match EPlus.

**Current order** (lines 66–74): NPI → Provider Name → Phone Number → Provider Id → Provider TIN → Provider Status → Provider Address.

**EPlus order** (RE doc §2.3): Provider Name → Provider ID → Provider TIN → Provider Contact # → *Provider NPI → Address.

**Implementation steps:**

1. In `providerVerificationModal.js`, replace the `verificationOptionsWithDisabled` getter options array (lines 66–74):

   ```js
   const options = [
       { label: 'Provider Name', value: 'Name' },
       { label: 'Provider ID', value: 'ProviderId' },
       { label: 'Provider TIN', value: 'ProviderTIN' },
       { label: 'Provider Contact #', value: 'Phone' },
       { label: 'Provider NPI', value: 'NPI' },
       { label: 'Address', value: 'ProviderAddress', isAddress: true },
   ];
   ```

   Note: `Provider Status` is removed (see B-4).

2. **Update the data display column** in `providerVerificationModal.html` (lines 48–61) to match the new order:

   ```html
   <div class="slds-col slds-size_1-of-2 slds-p-horizontal_small">
       <p class="data-value">{healthcareProvider.Name}</p>
       <p class="data-value">{healthcareProvider.ProviderId}</p>
       <p class="data-value">{healthcareProvider.ProviderTIN}</p>
       <p class="data-value">
           <a href={phoneTelLink} class="phone-link">{formattedPhoneNumber}</a>
       </p>
       <p class="data-value">{healthcareProvider.NPI}</p>
       <template if:true={isAddressPresent}>
           <div class="data-value">
               <p>{healthcareProvider.ProviderStreet}</p>
               <p>{healthcareProvider.ProviderCity}, {healthcareProvider.ProviderState} {healthcareProvider.ProviderZip}</p>
           </div>
       </template>
   </div>
   ```

3. **Add `phoneTelLink` getter** in `providerVerificationModal.js`:

   ```js
   get phoneTelLink() {
       if (this.healthcareProvider && this.healthcareProvider.Phone) {
           const digits = this.healthcareProvider.Phone.replace(/\D/g, '');
           return digits.length >= 10 ? `tel:+1${digits}` : '#';
       }
       return '#';
   }
   ```

4. **Add CSS** in `providerVerificationModal.css`:

   ```css
   .data-value {
       min-height: 22px;
   }

   .phone-link {
       color: #0070d2;
       text-decoration: none;
   }
   .phone-link:hover {
       text-decoration: underline;
   }
   ```

**Note:** This also addresses P-16 (phone as blue hyperlink) and removes bold label prefixes to match EPlus data display style.

---

### B-4. Remove Provider Status Checkbox

**RE doc ref:** P-03
**Priority:** MEDIUM

**Problem:** `providerVerificationModal.js` line 72: `{ label: 'Provider Status', value: 'Status' }`. EPlus does not include Provider Status as a verifiable attribute.

**Implementation steps:**

1. Remove the Provider Status entry from the `options` array in `verificationOptionsWithDisabled` getter. (Already handled in B-3 step 1 — the reordered list omits it.)

2. Remove the Provider Status data display line from `providerVerificationModal.html` line 54:

   ```html
   <!-- Remove this line -->
   <p><b>Provider Status:</b> {healthcareProvider.Status}</p>
   ```

**Decision note:** If COA wants to keep Provider Status as an EIDG addition (similar to Caller Name), this item can be skipped. Confirm with COA before implementing.

---

### B-5. Provider NPI Required-Asterisk Logic Fix

**RE doc ref:** §2.3 observation
**Priority:** LOW

**Problem:** `providerVerificationModal.js` line 81 — the `showAsterisk` logic currently marks NPI AND Address as required:

```js
const isRequired = (option.value === 'NPI' && isDataPresent) || (option.isAddress && isAddressComplete);
```

EPlus only marks `* Provider NPI` with an asterisk (when data is present). Address has no asterisk in EPlus.

**Implementation steps:**

1. In `providerVerificationModal.js`, simplify the `isRequired` calculation in `verificationOptionsWithDisabled`:

   ```js
   const isRequired = option.value === 'NPI' && isDataPresent;
   ```

---

### B-6. Provider Cancel Button Parity

**RE doc ref:** P-09
**Priority:** LOW

**Problem:** Same as A-14 for the provider path. `verifyProvider.html` line 65–67 has a neutral Close button in the footer. EPlus uses `× Cancel` (blue) in the modal body.

**Implementation steps:**

1. In `providerVerificationModal.html`, update the button section at lines 114–116. Add Cancel alongside Verify:

   ```html
   <div class="slds-grid slds-grid_align-center slds-m-top_medium">
       <lightning-button label="Cancel" variant="brand"
                         icon-name="utility:close"
                         onclick={handleCancel}
                         class="slds-m-right_small">
       </lightning-button>
       <lightning-button label={verifyButtonLabel} variant="brand"
                         icon-name="utility:check"
                         onclick={verify}
                         disabled={isSaving}>
       </lightning-button>
   </div>
   ```

2. **Add handler** in `providerVerificationModal.js`:

   ```js
   handleCancel() {
       this.dispatchEvent(new CustomEvent('close'));
   }
   ```

3. **Remove the footer Close button** from `verifyProvider.html` lines 65–67. Replace with an empty footer or remove.

---

## GROUP C — Cross-Component Fixes

### C-1. Member Case Origin: `required` Attribute

**RE doc ref:** §1.1.1
**Priority:** LOW

**Problem:** `memberVerificationModal.html` line 12–17 — Case Origin combobox is not marked `required`. EPlus shows a red asterisk.

**Implementation steps:**

1. Add `required` attribute to the Case Origin combobox in `memberVerificationModal.html`:

   ```html
   <lightning-combobox name="caseOrigin"
                       label="Case Origin"
                       value={caseOriginValue}
                       placeholder="Select Case Origin"
                       options={caseOriginOptions}
                       required
                       onchange={handleCaseOriginChange}>
   </lightning-combobox>
   ```

---

### C-2. Member Type `required` Attribute and Placeholder

**RE doc ref:** §1.1.4
**Priority:** LOW

**Problem:** `memberVerificationModal.html` lines 19–24 — Member Type combobox has no `required` attribute and no explicit placeholder.

**Implementation steps:**

1. Add `required` and `placeholder` to the Member Type combobox:

   ```html
   <lightning-combobox name="memberType"
                       label="Member Type"
                       value={memberTypeValue}
                       placeholder="Select Member Type"
                       options={memberTypeOptions}
                       required
                       onchange={handleMemberTypeChange}>
   </lightning-combobox>
   ```

---

### C-3. Phone Number Formatting Parity (Parenthesized Format)

**RE doc ref:** §1.2.1 observation, §2.3
**Priority:** LOW

**Problem:** Both modal JS files format phone as `XXX-XXX-XXXX` (dash-separated). EPlus uses `(XXX) XXX-XXXX` (parenthesized area code).

**Affected code:**
- `memberVerificationModal.js` lines 65–71 `formattedPhoneNumber` getter
- `providerVerificationModal.js` lines 52–58 `formattedPhoneNumber` getter

**Implementation steps:**

1. In both files, update the `formattedPhoneNumber` getter:

   ```js
   get formattedPhoneNumber() {
       const phone = this.account ? this.account.Phone : (this.healthcareProvider ? this.healthcareProvider.Phone : null);
       if (phone) {
           const digits = phone.replace(/\D/g, '');
           const match = digits.match(/^(\d{3})(\d{3})(\d{4})$/);
           if (match) {
               return `(${match[1]}) ${match[2]}-${match[3]}`;
           }
           return phone;
       }
       return '';
   }
   ```

   Adjust the object reference (`this.account` for member, `this.healthcareProvider` for provider) per each file.

2. Also update `verifyMember.js` `formatPhoneNumber()` (line 37–47) and `verifyProvider.js` `formatPhoneNumber()` (line 21–31) for the table display:

   ```js
   formatPhoneNumber(phone) {
       if (phone) {
           const digits = phone.replace(/\D/g, '');
           const match = digits.match(/^(\d{3})(\d{3})(\d{4})$/);
           if (match) {
               return `(${match[1]}) ${match[2]}-${match[3]}`;
           }
           return phone;
       }
       return '';
   }
   ```

---

## GROUP D — Scoping Decisions Required (Deferred or Conditional Items)

These items cannot be fully implemented without a COA decision. They are documented here with implementation approach so that development can proceed immediately once a decision is made.

### D-1. EPlus Authorization Record Creation (Personal Representative Path)

**RE doc ref:** §1.6.5
**Status:** DEFERRED — requires COA scoping decision.

**Problem:** EPlus creates authorization records in real-time when CSR selects a non-Parent relationship type. The `Start Date` defaults to today, indicating a new record is being created during the call. Our LWC captures the fields (after A-11) but has no backend to persist authorization records.

**What would be needed:**
1. Identify the EPlus managed package object for authorized representatives (likely `UST_EPLUS__Authorized_Representative__c` or similar).
2. Determine if our profile/permission set has create access.
3. Write an Apex controller method to create the authorization record.
4. Wire it into the LWC save flow.

**Action:** Raise with COA. If approved, implement as a follow-on work item after the UI parity work is complete.

---

### D-2. Provider Status Checkbox — Keep or Remove?

**RE doc ref:** P-03
**Status:** DECISION NEEDED from COA.

EPlus does not include `Provider Status` as a verification checkbox. Our LWC does. Options:
- **Remove** for full parity (implemented in B-4).
- **Keep** as an intentional EIDG addition (like Caller Name/Phone).

**Action:** Confirm with COA before implementing B-4.

---

### D-3. Minimum Checkbox Count — EPlus Validation Threshold

**RE doc ref:** §1.7, §2.5
**Status:** PENDING — requires sandbox testing.

**Problem:** Our LWC requires ≥3 checkboxes for Member (`memberVerificationModal.js` line 212) and ≥2 for Provider (`providerVerificationModal.js` line 154). The EPlus minimum is unknown — it was not captured during the reverse-engineering session.

**Action:** Jason to test in sandbox: attempt EPlus Verify with 0, 1, 2, 3 checkboxes and document the exact minimum required. Once known, update the threshold in both JS files.

---

### D-4. Caller Type Dropdown Options — Provider Modal

**RE doc ref:** P-12
**Status:** PENDING — EPlus dropdown not opened in screenshots.

**Problem:** `providerVerificationModal.js` lines 39–45 define Caller Type options: Billing Office, Provider/Clinical Office, Hospital Staff/Facility, Other. The exact EPlus options are unconfirmed.

**Action:** Jason to open the EPlus Caller Type dropdown in the sandbox and confirm the option list. Update `callerTypeOptions` if mismatches are found.

---

### D-5. Verify Button Success/Error Behavior — EPlus Post-Submit UX (Impacts Navigation Design)

**RE doc ref:** §1.7, §2.5
**Status:** PENDING — not yet observed.

**Problem:** We don't know what EPlus does after successful Verify click (modal close? navigation? toast?) or on validation failure (error text? inline? banner?).

**Action:** Jason to complete a full verification in EPlus sandbox and document:
- What happens on success (navigation, modal close, toast message?)
- What happens on failure (error message text, placement)

**Impact:** Current Genesys modals dispatch `close`, then navigate via `window.location.href`. If EPlus behaves differently (e.g., stays in modal, shows toast, returns to search), the navigation logic in `createVerificationRecord()` (both modals) and `handleModalClose()` (both parents) will need to be restructured. This should be confirmed before Phase 1 implementation is considered complete.

---

### D-6. Member and Provider Non-Phone Origins — Caller Name Save Behavior

**RE doc ref:** §1.1.3 (Member), P-18 (Provider)
**Status:** DECISION NEEDED from COA — **blocks A-1 step 5 and B-1 step 5.**

**Problem:** For non-phone Case Origins, EPlus creates a verification record with only Case Origin populated — no caller name, no caller phone. Our `createVerificationRecord()` always writes `UST_EPLUS__Caller_Name__c`. If this field is **required at the object level** (via field definition or validation rule), passing empty string will cause a DML error at save time.

This affects both Member (A-1 `verifyPhaseOne()`) and Provider (B-1 `verify()` non-phone path).

**Options:**
- **Option A — EPlus parity:** No caller name for non-phone origins. Save with empty string. Works only if `UST_EPLUS__Caller_Name__c` allows blanks.
- **Option B — Optional:** Show Caller Name field in the non-phone view but don't require it. CSR can fill it if known. Departs from EPlus visually but preserves Body 1 data-capture philosophy.
- **Option C — Required:** Require Caller Name even for non-phone origins. Strongest data capture, furthest from EPlus parity.

**Pre-implementation test:** Before deciding, verify whether `UST_EPLUS__Caller_Name__c` is required at the object/validation-rule level. This can be checked via Setup > Object Manager > Verification Information > Fields, or by attempting a `createRecord` with an empty caller name in the browser console.

**Action:** COA to decide Option A/B/C. If the field is required at the object level, Option A is not viable without a field-level change.

---

## Implementation Order

Recommended sequencing based on dependency chains and priority:

### Phase 1 — Critical Behavioral Gaps (must-fix for functional parity)

| Order | Item | Component | Description |
|-------|------|-----------|-------------|
| 1 | A-1 | Member modal | Phone/non-phone gate for Member Type |
| 2 | B-1 | Provider modal | Phone/non-phone conditional gate |
| 3 | B-2 | Provider modal | Case Origin value mismatches (data integrity) |
| 4 | A-11 | Member modal | Personal Rep expanded field set |

### Phase 2 — Structural Parity (required for visual alignment)

| Order | Item | Component | Description |
|-------|------|-----------|-------------|
| 5 | A-4 | Member modal | Member Details section header |
| 6 | A-5 | Member modal | Remove bold label prefixes + phone hyperlink |
| 7 | A-8 | Member modal | Representative Details section header |
| 8 | A-9 | Member modal | Rep Type placeholder + required |
| 9 | A-10 | Member modal | Relationship Type required |
| 10 | B-3 | Provider modal | Checkbox label + order + phone hyperlink |
| 11 | B-4 | Provider modal | Remove Provider Status (pending D-2 decision) |
| 12 | B-5 | Provider modal | NPI asterisk logic fix |
| 13 | A-13 | Both modals | Inline validation (reportValidity) |

### Phase 3 — Cosmetic Alignment

| Order | Item | Component | Description |
|-------|------|-----------|-------------|
| 14 | A-2 | Both modals | Interaction banner text |
| 15 | A-3 | Member modal | Case Origin label cosmetics |
| 16 | A-6 | Member modal | Date format M/D/YYYY |
| 17 | A-7 | Member modal | Mailing address country |
| 18 | A-14 | Member parent | Cancel/Go Back button parity |
| 19 | B-6 | Provider parent | Cancel button parity |
| 20 | C-1 | Member modal | Case Origin required attribute |
| 21 | C-2 | Member modal | Member Type required + placeholder |
| 22 | C-3 | Both modals | Phone format (XXX) XXX-XXXX |

### Phase 4 — Scoping Decisions (blocked on COA input)

| Item | Dependency | Blocks |
|------|------------|--------|
| D-6 | COA decides caller name behavior for non-phone origins + field requirement check | A-1 step 5, B-1 step 5 |
| D-1 | COA confirms EPlus auth rep object access | A-11 backend, A-12 backend |
| D-2 | COA decides keep/remove Provider Status | B-4 |
| D-3 | Jason tests EPlus checkbox minimum | verify() thresholds in both modals |
| D-4 | Jason captures EPlus Caller Type options | B-3 callerTypeOptions |
| D-5 | Jason completes EPlus full verification flow | Navigation logic in both modals |
| A-12 | COA confirms feasibility of legal rep lookup | Legal Rep lookup functionality |

---

## File Manifest

All files that will be modified by this plan:

| File | Items |
|------|-------|
| `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.js` | A-1, A-3, A-5, A-6, A-7, A-11, A-12, A-13, A-14, C-3 |
| `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.html` | A-1, A-2, A-4, A-5, A-8, A-9, A-10, A-11, A-12, A-13, A-14, C-1, C-2 |
| `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.css` | A-4, A-5 |
| `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.js` | B-1, B-2, B-3, B-5, B-6, A-13, C-3 |
| `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.html` | B-1, B-3, B-4, B-6, A-2, A-13 |
| `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.css` | B-3, B-6 |
| `force-app/main/default/lwc/verifyMember/verifyMember.js` | A-6, C-3 |
| `force-app/main/default/lwc/verifyMember/verifyMember.html` | A-14 |
| `force-app/main/default/lwc/verifyProvider/verifyProvider.js` | C-3 |
| `force-app/main/default/lwc/verifyProvider/verifyProvider.html` | B-6 |
