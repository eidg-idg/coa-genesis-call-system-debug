# Genesys Call System — Remediation Implementation Plan

> This document contains the exact code changes required to implement every remediation step identified in [genesysCodeAnalysis.md](genesysCodeAnalysis.md) and [genesysCodeAnalysisSummary.md](genesysCodeAnalysisSummary.md). No pseudocode. No assumptions. Every change is written against the actual source files in this repository.

**Sequencing note:** Steps are cumulative and must be applied in order. When a step says "Current code," it means the state of the file at that point in the sequence — after all preceding steps have been applied. Steps that reference earlier changes (e.g., "after Step 1.5b, the modal tag is...") are documenting the intermediate state, not the original repository state.

**Line number note:** Line numbers are provided as approximate navigation aids. The exact code snippets are the authoritative matching reference. After applying early steps, later line numbers in the same file will shift. Always match on the code snippet, not the line number.

---

## Table of Contents

1. [Phase 1: Fix Verification Data Logging](#phase-1-fix-verification-data-logging)
   - [Step 1.1 — Fix save-before-close in memberVerificationModal](#step-11--fix-save-before-close-in-memberverificationmodal)
   - [Step 1.2 — Fix save-before-close in providerVerificationModal](#step-12--fix-save-before-close-in-providerverificationmodal)
   - [Step 1.3 — Always-visible Caller Name/Phone in memberVerificationModal](#step-13--always-visible-caller-namephone-in-memberverificationmodal)
   - [Step 1.4 — Always-visible Caller Name/Phone in providerVerificationModal](#step-14--always-visible-caller-namephone-in-providerverificationmodal)
   - [Step 1.5 — Fix imperative data passing in verifyProvider](#step-15--fix-imperative-data-passing-in-verifyprovider)
   - [Step 1.6 — Require Case Origin for provider verification](#step-16--require-case-origin-for-provider-verification)
   - [Step 1.7 — Pass ANI through the full data pipeline](#step-17--pass-ani-through-the-full-data-pipeline)
2. [Phase 2: Best Practices Improvements](#phase-2-best-practices-improvements)
   - [Step 2.1 — Add try-catch to GenesysCTIExtensionClassV2](#step-21--add-try-catch-to-genesysctiextensionclassv2)
   - [Step 2.2 — Guard RecordType query](#step-22--guard-recordtype-query)
   - [Step 2.3 — (DEFERRED) Populate Interaction records](#step-23--deferred-populate-interaction-records)
   - [Step 2.4 — Replace hardcoded RecordType IDs in trigger (SEPARATE DEPLOYMENT)](#step-24--replace-hardcoded-recordtype-ids-in-trigger-separate-deployment)
   - [Step 2.5 — Fix callerType combobox handler](#step-25--fix-callertype-combobox-handler)
   - [Step 2.6 — Make sharing mode explicit](#step-26--make-sharing-mode-explicit)
   - [Step 2.7 — Add exception handling to VF page controllers](#step-27--add-exception-handling-to-vf-page-controllers)
   - [Step 2.8 — (MERGED) Error feedback on save failure](#step-28--merged-error-feedback-on-save-failure)
   - [Step 2.9 — Remove dead recursive modal template](#step-29--remove-dead-recursive-modal-template)
3. [Phase 3: Cleanup](#phase-3-cleanup)
   - [Step 3.1 — Add JSENCODE to VF pages](#step-31--add-jsencode-to-vf-pages)
   - [Step 3.2 — Move trigger logic to handler class](#step-32--move-trigger-logic-to-handler-class)
   - [Step 3.3 — Improve error logging in DelayedDeleteHandler](#step-33--improve-error-logging-in-delayeddeletehandler)
   - [Step 3.4 — Remove @track from primitives](#step-34--remove-track-from-primitives)
   - [Step 3.5 — Remove or archive legacy screen pop classes](#step-35--remove-or-archive-legacy-screen-pop-classes)
   - [Step 3.6 — Add SOQL LIMIT clauses](#step-36--add-soql-limit-clauses)
   - [Step 3.7 — Remove unused class-level variables](#step-37--remove-unused-class-level-variables)
   - [Step 3.8 — (DEFERRED) Phone normalization](#step-38--deferred-phone-normalization)
4. [Test Class Updates](#test-class-updates)
   - [TestGenesysCTIExtensionClassV2 updates](#testgenesysctiextensionclassv2-updates)
   - [Test_GC_Account_PageController updates](#test_gc_account_pagecontroller-updates)
   - [Test_GC_HCPPageController updates](#test_gc_hcppagecontroller-updates)
   - [testHealthcareProviderTrigger updates (SEPARATE DEPLOYMENT)](#testhealthcareprovidertrigger-updates-separate-deployment)
   - [New test class: HealthcareProviderTriggerHandlerTest](#new-test-class-healthcareprovidertriggerhandlertest)
5. [Deployment Manifest](#deployment-manifest)

---

## Phase 1: Fix Verification Data Logging

---

### Step 1.1 — Fix save-before-close in memberVerificationModal

**File:** `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.js`

This step reverses the order of operations in the `verify()` method so the verification record is saved **before** the close event is dispatched. On failure, the modal stays open with an error message and the CSR can retry.

#### Change 1.1a — Add tracked properties for save state

**Current code (lines 26-28):**
```javascript
    @track nameValue = ''; // New: Stores the entered Name value.
    @track callerPhoneValue = ''; // New: Stores the entered Caller Phone value.
    @track descriptionValue = ''; // New: Stores the entered Description value.
```

**Replace with:**
```javascript
    @track nameValue = ''; // New: Stores the entered Name value.
    @track callerPhoneValue = ''; // New: Stores the entered Caller Phone value.
    @track descriptionValue = ''; // New: Stores the entered Description value.
    @track isSaving = false;
    @track errorMessage = '';
```

#### Change 1.1b — Rewrite the verify() method

**Current code (lines 187-221):**
```javascript
    verify() {
        console.log('Test Account data on verify:', JSON.stringify(this.account));

        const recordId = this.extractRecordId(this.account);
        if (recordId) {
            this.masterAccountId = recordId;
            console.log('Test Master Account ID:', this.masterAccountId);
            console.log(this.checkedValues.length);

            if (this.checkedValues.length >= 3) {
                const verificationData = {
                    interactionId: this.interactionId,
                    callerName: this.nameValue,
                    accountId: this.masterAccountId,
                    caseOrigin: this.caseOriginValue, // Added field
                    representativeType: this.representativeTypeValue, // Added field
                    callerPhone: this.callerPhoneValue, // Added field
                };
                console.log('Verification Data:', JSON.stringify(verificationData));

                // Dispatch event to parent with verification data
                const closeEvent = new CustomEvent('close', {
                    detail: { verificationData }
                });
                this.dispatchEvent(closeEvent);

                this.createVerificationRecord(verificationData);
            } else {
                alert("I'm sorry, the member could not be verified.");
            }
        } else {
            console.error('No recordId found in account data.');
            alert("I'm sorry, the member could not be verified.");
        }
    }
```

**Replace with:**
```javascript
    verify() {
        console.log('Test Account data on verify:', JSON.stringify(this.account));

        const recordId = this.extractRecordId(this.account);
        if (recordId) {
            this.masterAccountId = recordId;
            console.log('Test Master Account ID:', this.masterAccountId);
            console.log(this.checkedValues.length);

            // Validate caller name is provided
            if (!this.nameValue || this.nameValue.trim() === '') {
                this.errorMessage = 'Caller Name is required.';
                return;
            }

            if (this.checkedValues.length >= 3) {
                const verificationData = {
                    interactionId: this.interactionId,
                    callerName: this.nameValue,
                    accountId: this.masterAccountId,
                    caseOrigin: this.caseOriginValue,
                    representativeType: this.representativeTypeValue,
                    callerPhone: this.callerPhoneValue,
                };
                console.log('Verification Data:', JSON.stringify(verificationData));

                this.isSaving = true;
                this.errorMessage = '';
                this.createVerificationRecord(verificationData);
            } else {
                this.errorMessage = "I'm sorry, the member could not be verified. Please select at least three verification items.";
            }
        } else {
            console.error('No recordId found in account data.');
            this.errorMessage = "I'm sorry, the member could not be verified.";
        }
    }
```

#### Change 1.1c — Rewrite createVerificationRecord() to save-then-close

**Current code (lines 239-258):**
```javascript
    createVerificationRecord(data) {
        const fields = {};
        fields[CSR_INTERACTION_FIELD.fieldApiName] = data.interactionId;
        fields[CALLER_NAME_FIELD.fieldApiName] = data.callerName;
        fields[MEMBER_FIELD.fieldApiName] = data.accountId;
        fields[CASE_ORIGIN_FIELD.fieldApiName] = data.caseOrigin; // Added field
        fields[CALLER_RELATIONSHIP_TO_MEMBER_FIELD.fieldApiName] = data.representativeType; // Added field
        fields[CALLER_PHONE_FIELD.fieldApiName] = data.callerPhone; // Added field

        const recordInput = { apiName: VERIFICATION_INFORMATION_OBJECT.objectApiName, fields };
        createRecord(recordInput)
            .then(result => {
                console.log('Verification Information Record Created:', result);
                this.navigateToAccountPage(data.accountId);
            })
            .catch(error => {
                console.error('Error creating verification information record:', error);
                this.navigateToAccountPage(data.accountId);
            });
    }
```

**Replace with:**
```javascript
    createVerificationRecord(data) {
        const fields = {};
        fields[CSR_INTERACTION_FIELD.fieldApiName] = data.interactionId;
        fields[CALLER_NAME_FIELD.fieldApiName] = data.callerName;
        fields[MEMBER_FIELD.fieldApiName] = data.accountId;
        fields[CASE_ORIGIN_FIELD.fieldApiName] = data.caseOrigin;
        fields[CALLER_RELATIONSHIP_TO_MEMBER_FIELD.fieldApiName] = data.representativeType;
        fields[CALLER_PHONE_FIELD.fieldApiName] = data.callerPhone;

        const recordInput = { apiName: VERIFICATION_INFORMATION_OBJECT.objectApiName, fields };
        createRecord(recordInput)
            .then(result => {
                console.log('Verification Information Record Created:', result);
                this.isSaving = false;
                const closeEvent = new CustomEvent('close', {
                    detail: { verificationData: data }
                });
                this.dispatchEvent(closeEvent);
                this.navigateToAccountPage(data.accountId);
            })
            .catch(error => {
                console.error('Error creating verification information record:', error);
                this.isSaving = false;
                this.errorMessage = 'Verification record could not be saved. Please try again.';
            });
    }
```

#### Change 1.1d — Add error display and disable button while saving in HTML

**File:** `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.html`

**Current code (lines 117-120):**
```html
                <!-- Center the button at the bottom -->
                <div class="slds-grid slds-grid_align-center slds-m-top_medium">
                    <lightning-button label="Verify" variant="brand" onclick={verify}></lightning-button>
                </div>
```

**Replace with:**
```html
                <!-- Error message display -->
                <template if:true={errorMessage}>
                    <div class="slds-notify slds-notify_alert slds-alert_warning slds-m-around_medium" role="alert">
                        <span>{errorMessage}</span>
                    </div>
                </template>

                <!-- Center the button at the bottom -->
                <div class="slds-grid slds-grid_align-center slds-m-top_medium">
                    <lightning-button label={verifyButtonLabel} variant="brand" onclick={verify} disabled={isSaving}></lightning-button>
                </div>
```

#### Change 1.1e — Add verifyButtonLabel getter in JS

**File:** `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.js`

Add this getter after the existing `relationshipTypeOptions` getter (after line 92):

```javascript
    get verifyButtonLabel() {
        return this.isSaving ? 'Saving...' : 'Verify';
    }
```

**Insert location:** After line 92 (after the closing `}` of `get relationshipTypeOptions()`), add:

```javascript

    get verifyButtonLabel() {
        return this.isSaving ? 'Saving...' : 'Verify';
    }
```

---

### Step 1.2 — Fix save-before-close in providerVerificationModal

**File:** `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.js`

Same pattern as Step 1.1 — save the record before dispatching the close event.

#### Change 1.2a — Add tracked properties for save state

**Current code (lines 21-22):**
```javascript
    @track callerPhoneNumber = '';
    @track phoneExtension = '';
```

**Replace with:**
```javascript
    @track callerPhoneNumber = '';
    @track phoneExtension = '';
    @track isSaving = false;
    @track errorMessage = '';
```

#### Change 1.2b — Rewrite the verify() method

**Current code (lines 121-147):**
```javascript
    verify() {
        console.log('HealthcareProvider data on verify:', JSON.stringify(this.healthcareProvider));
        console.log('Provider ID:', this.providerId);
        console.log('Interaction ID:', this.interactionId);
        console.log('Interaction Name:', this.interactionName);
        console.log('Number of checked values:', this.checkedValues.length);

        if (this.checkedValues.length >= 2) {
            const verificationData = {
                interactionId: this.interactionId,
                providerId: this.providerId, // Ensure this is passed
                caseOrigin: this.caseOriginValue,
                callerName: this.callerName,
                callerPhone: this.callerPhoneNumber,
            };
            console.log('Verification Data:', JSON.stringify(verificationData));

            const closeEvent = new CustomEvent('close', {
                detail: { verificationData }
            });
            this.dispatchEvent(closeEvent);

            this.createVerificationRecord(verificationData);
        } else {
            alert("Please select at least two verification options to proceed.");
        }
    }
```

**Replace with:**
```javascript
    verify() {
        console.log('HealthcareProvider data on verify:', JSON.stringify(this.healthcareProvider));
        console.log('Provider ID:', this.providerId);
        console.log('Interaction ID:', this.interactionId);
        console.log('Interaction Name:', this.interactionName);
        console.log('Number of checked values:', this.checkedValues.length);

        // Validate Case Origin is selected
        if (!this.caseOriginValue) {
            this.errorMessage = 'Please select a Case Origin before verifying.';
            return;
        }

        // Validate caller name is provided
        if (!this.callerName || this.callerName.trim() === '') {
            this.errorMessage = 'Caller Name is required.';
            return;
        }

        if (this.checkedValues.length >= 2) {
            const verificationData = {
                interactionId: this.interactionId,
                providerId: this.providerId,
                caseOrigin: this.caseOriginValue,
                callerName: this.callerName,
                callerPhone: this.callerPhoneNumber,
            };
            console.log('Verification Data:', JSON.stringify(verificationData));

            this.isSaving = true;
            this.errorMessage = '';
            this.createVerificationRecord(verificationData);
        } else {
            this.errorMessage = "Please select at least two verification options to proceed.";
        }
    }
```

#### Change 1.2c — Rewrite createVerificationRecord() to save-then-close

**Current code (lines 149-167):**
```javascript
    createVerificationRecord(data) {
        const fields = {};
        fields[CSR_INTERACTION_FIELD.fieldApiName] = data.interactionId;
        fields[CALLER_NAME_FIELD.fieldApiName] = data.callerName;
        fields[PROVIDER_FIELD.fieldApiName] = data.providerId; // Use the correct providerId
        fields[CASE_ORIGIN_FIELD.fieldApiName] = data.caseOrigin;
        fields[CALLER_PHONE_FIELD.fieldApiName] = data.callerPhone;

        const recordInput = { apiName: VERIFICATION_INFORMATION_OBJECT.objectApiName, fields };
        createRecord(recordInput)
            .then(result => {
                console.log('Verification Information Record Created:', result);
                this.navigateToProviderPage(data.providerId); // Ensure correct providerId
            })
            .catch(error => {
                console.error('Error creating verification information record:', error);
                this.navigateToProviderPage(data.providerId); // Handle error and navigate
            });
    }
```

**Replace with:**
```javascript
    createVerificationRecord(data) {
        const fields = {};
        fields[CSR_INTERACTION_FIELD.fieldApiName] = data.interactionId;
        fields[CALLER_NAME_FIELD.fieldApiName] = data.callerName;
        fields[PROVIDER_FIELD.fieldApiName] = data.providerId;
        fields[CASE_ORIGIN_FIELD.fieldApiName] = data.caseOrigin;
        fields[CALLER_PHONE_FIELD.fieldApiName] = data.callerPhone;

        const recordInput = { apiName: VERIFICATION_INFORMATION_OBJECT.objectApiName, fields };
        createRecord(recordInput)
            .then(result => {
                console.log('Verification Information Record Created:', result);
                this.isSaving = false;
                const closeEvent = new CustomEvent('close', {
                    detail: { verificationData: data }
                });
                this.dispatchEvent(closeEvent);
                this.navigateToProviderPage(data.providerId);
            })
            .catch(error => {
                console.error('Error creating verification information record:', error);
                this.isSaving = false;
                this.errorMessage = 'Verification record could not be saved. Please try again.';
            });
    }
```

#### Change 1.2d — Add error display and disable button while saving in HTML

**File:** `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.html`

**Current code (lines 100-103):**
```html
                <!-- Verification Button -->
                <div class="slds-grid slds-grid_align-center slds-m-top_medium">
                    <lightning-button label="Verify" variant="brand" onclick={verify}></lightning-button>
                </div>
```

**Replace with:**
```html
                <!-- Error message display -->
                <template if:true={errorMessage}>
                    <div class="slds-notify slds-notify_alert slds-alert_warning slds-m-around_medium" role="alert">
                        <span>{errorMessage}</span>
                    </div>
                </template>

                <!-- Verification Button -->
                <div class="slds-grid slds-grid_align-center slds-m-top_medium">
                    <lightning-button label={verifyButtonLabel} variant="brand" onclick={verify} disabled={isSaving}></lightning-button>
                </div>
```

#### Change 1.2e — Add verifyButtonLabel getter in JS

**File:** `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.js`

Add after the `get callerTypeOptions()` getter (after line 43):

```javascript

    get verifyButtonLabel() {
        return this.isSaving ? 'Saving...' : 'Verify';
    }
```

---

### Step 1.3 — Always-visible Caller Name/Phone in memberVerificationModal

This moves the Caller Name and Caller Phone fields out of the `showAdditionalFields` conditional so they are visible for all call types, not just Non-Member with a Representative Type selected.

#### Change 1.3a — Add always-visible caller fields in HTML

**File:** `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.html`

**Current code (lines 67-115):**
```html
                </template>

                <!-- Representative Details Section -->
                <template if:true={showRepresentativeDetails}>
                    <div class="slds-m-around_medium">
                        <lightning-combobox name="representativeType"
                                            label="Representative Type"
                                            value={representativeTypeValue}
                                            options={representativeTypeOptions}
                                            onchange={handleRepresentativeTypeChange}>
                        </lightning-combobox>
                    </div>

                    <!-- Relationship Type Dropdown, shown for Personal Representative -->
                    <template if:true={showRelationshipType}>
                        <div class="slds-m-around_medium">
                            <lightning-combobox name="relationshipType"
                                                label="Relationship Type"
                                                value={relationshipTypeValue}
                                                options={relationshipTypeOptions}
                                                onchange={handleRelationshipTypeChange}>
                            </lightning-combobox>
                        </div>
                    </template>
                </template>

                <!-- Additional Fields Section -->
                <template if:true={showAdditionalFields}>
                    <div class="slds-m-around_medium">
                        <lightning-input label="Name"
                                         name="name"
                                         value={nameValue}
                                         onchange={handleNameChange}>
                        </lightning-input>

                        <lightning-input label="Caller Phone"
                                         name="callerPhone"
                                         value={callerPhoneValue}
                                         onchange={handleCallerPhoneChange}>
                        </lightning-input>

                        <lightning-textarea label="Description"
                                            name="description"
                                            value={descriptionValue}
                                            onchange={handleDescriptionChange}
                                            rows="3">
                        </lightning-textarea>
                    </div>
                </template>
```

**Replace with:**
```html
                </template>

                <!-- Caller Information - always visible during verification -->
                <template if:true={showVerificationSection}>
                    <div class="slds-m-around_medium">
                        <lightning-input label="Caller Name"
                                         name="callerName"
                                         value={nameValue}
                                         required
                                         onchange={handleNameChange}>
                        </lightning-input>

                        <lightning-input label="Caller Phone"
                                         name="callerPhone"
                                         value={callerPhoneValue}
                                         onchange={handleCallerPhoneChange}>
                        </lightning-input>
                    </div>
                </template>

                <!-- Representative Details Section -->
                <template if:true={showRepresentativeDetails}>
                    <div class="slds-m-around_medium">
                        <lightning-combobox name="representativeType"
                                            label="Representative Type"
                                            value={representativeTypeValue}
                                            options={representativeTypeOptions}
                                            onchange={handleRepresentativeTypeChange}>
                        </lightning-combobox>
                    </div>

                    <!-- Relationship Type Dropdown, shown for Personal Representative -->
                    <template if:true={showRelationshipType}>
                        <div class="slds-m-around_medium">
                            <lightning-combobox name="relationshipType"
                                                label="Relationship Type"
                                                value={relationshipTypeValue}
                                                options={relationshipTypeOptions}
                                                onchange={handleRelationshipTypeChange}>
                            </lightning-combobox>
                        </div>
                    </template>
                </template>

                <!-- Additional Fields Section (Non-Member specific) -->
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

**What changed:**
- New "Caller Information" block added after the verification section, gated by `showVerificationSection` (visible for all call types once Case Origin and Member Type are selected)
- Caller Name field is now `required` with label "Caller Name"
- Caller Phone field remains optional
- The old `showAdditionalFields` block no longer contains Name or Caller Phone inputs — only the Description textarea remains there (specific to Non-Member flows)

**No JS changes needed for this step.** The `nameValue`, `callerPhoneValue`, `handleNameChange`, and `handleCallerPhoneChange` already exist and will work with the new field locations. The caller name validation was already added in Step 1.1b.

---

### Step 1.4 — Always-visible Caller Name/Phone in providerVerificationModal

This moves the Caller Name and Caller Phone fields out of the `isCallingOnBehalf` conditional.

#### Change 1.4a — Add always-visible caller fields, restructure conditional block

**File:** `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.html`

**Current code (lines 63-98):**
```html
                </div>

                <!-- Are you calling on behalf of a Provider? Checkbox -->
                <div class="slds-grid slds-grid_align-center slds-m-top_medium">
                    <lightning-input type="checkbox"
                                     label="Are you calling on behalf of a Provider?"
                                     checked={isCallingOnBehalf}
                                     onchange={handleIsCallingOnBehalfChange}></lightning-input>
                </div>

                <!-- Conditional Additional Fields -->
                <template if:true={isCallingOnBehalf}>
                    <div class="slds-grid slds-gutters">
                        <div class="slds-col slds-size_1-of-1 slds-p-horizontal_small">
                            <lightning-input type="text"
                                            label="Caller Name"
                                            name="callerName"
                                            value={callerName}
                                            onchange={handleInputChange}></lightning-input>
                            <lightning-combobox name="callerType"
                                                label="Caller Type"
                                                value={callerTypeValue}
                                                options={callerTypeOptions}
                                                onchange={handleInputChange}></lightning-combobox>
                            <lightning-input type="text"
                                            label="Phone Number"
                                            name="callerPhoneNumber"
                                            value={callerPhoneNumber}
                                            onchange={handleInputChange}></lightning-input>
                            <lightning-input type="text"
                                            label="Phone Extension"
                                            name="phoneExtension"
                                            value={phoneExtension}
                                            onchange={handleInputChange}></lightning-input>
                        </div>
                    </div>
                </template>
```

**Replace with:**
```html
                </div>

                <!-- Caller Information - always visible -->
                <div class="slds-m-around_medium">
                    <lightning-input type="text"
                                    label="Caller Name"
                                    name="callerName"
                                    value={callerName}
                                    required
                                    onchange={handleInputChange}></lightning-input>
                    <lightning-input type="text"
                                    label="Phone Number"
                                    name="callerPhoneNumber"
                                    value={callerPhoneNumber}
                                    onchange={handleInputChange}></lightning-input>
                </div>

                <!-- Are you calling on behalf of a Provider? Checkbox -->
                <div class="slds-grid slds-grid_align-center slds-m-top_medium">
                    <lightning-input type="checkbox"
                                     label="Are you calling on behalf of a Provider?"
                                     checked={isCallingOnBehalf}
                                     onchange={handleIsCallingOnBehalfChange}></lightning-input>
                </div>

                <!-- Conditional Additional Fields (delegation-specific) -->
                <template if:true={isCallingOnBehalf}>
                    <div class="slds-grid slds-gutters">
                        <div class="slds-col slds-size_1-of-1 slds-p-horizontal_small">
                            <lightning-combobox name="callerType"
                                                label="Caller Type"
                                                value={callerTypeValue}
                                                options={callerTypeOptions}
                                                onchange={handleCallerTypeChange}></lightning-combobox>
                            <lightning-input type="text"
                                            label="Phone Extension"
                                            name="phoneExtension"
                                            value={phoneExtension}
                                            onchange={handleInputChange}></lightning-input>
                        </div>
                    </div>
                </template>
```

**What changed:**
- Caller Name and Phone Number moved **before** the "calling on behalf" checkbox, always visible
- Caller Name is now `required`
- The `isCallingOnBehalf` conditional block now only contains Caller Type combobox and Phone Extension (delegation-specific fields)
- Caller Type combobox `onchange` changed from `handleInputChange` to `handleCallerTypeChange` (this is Step 2.5, done here since we're already restructuring this block)
- Caller name validation was already added in Step 1.2b

---

### Step 1.5 — Fix imperative data passing in verifyProvider

This eliminates the `setTimeout` data-passing hack and uses declarative template attributes, matching the `verifyMember` pattern.

#### Change 1.5a — Convert selectedProvider from method to getter and simplify openModal

**File:** `force-app/main/default/lwc/verifyProvider/verifyProvider.js`

**Current code (lines 58-86):**
```javascript
    openModal(providerId) {
        this.selectedProviderId = providerId;
        this.isModalOpen = true;

        console.log('Modal open:', this.isModalOpen);
        console.log('Selected Provider ID:', this.selectedProviderId);

        // Wait for the modal to be rendered before setting the interaction data
        setTimeout(() => {
            const modal = this.template.querySelector('c-provider-verification-modal');
            if (modal) {
                modal.interactionId = this.interactionRecordId;
                modal.interactionName = this.interactionName;
                modal.providerId = this.selectedProviderId; // Pass providerId directly
                modal.healthcareProvider = this.selectedProvider();
            }
        }, 0);
    }

    handleModalClose() {
        this.isModalOpen = false;
        this.selectedProviderId = null;
        this.interactionRecordId = null;
        this.interactionName = null;
    }

    selectedProvider() {
        return this.providers.find(provider => provider.recordId === this.selectedProviderId);
    }
```

**Replace with:**
```javascript
    openModal(providerId) {
        this.selectedProviderId = providerId;
        this.isModalOpen = true;
        console.log('Modal open:', this.isModalOpen);
        console.log('Selected Provider ID:', this.selectedProviderId);
    }

    handleModalClose() {
        this.isModalOpen = false;
        this.selectedProviderId = null;
        this.interactionRecordId = null;
        this.interactionName = null;
    }

    get selectedProvider() {
        return this.providers.find(provider => provider.recordId === this.selectedProviderId);
    }
```

#### Change 1.5b — Pass all data declaratively in HTML

**File:** `force-app/main/default/lwc/verifyProvider/verifyProvider.html`

**Current code (lines 55-58):**
```html
                    <c-provider-verification-modal
                        healthcare-provider={selectedProvider}
                        onclose={handleModalClose}>
                    </c-provider-verification-modal>
```

**Replace with:**
```html
                    <c-provider-verification-modal
                        healthcare-provider={selectedProvider}
                        interaction-id={interactionRecordId}
                        interaction-name={interactionName}
                        provider-id={selectedProviderId}
                        onclose={handleModalClose}>
                    </c-provider-verification-modal>
```

**What changed:** All four data attributes (`healthcare-provider`, `interaction-id`, `interaction-name`, `provider-id`) are now passed declaratively through the template. LWC handles reactivity automatically — when `isModalOpen` becomes true and the modal renders, it receives the current values of all bound properties. The `setTimeout` + `querySelector` pattern is completely eliminated.

---

### Step 1.6 — Require Case Origin for provider verification

The Case Origin validation check was already added in Step 1.2b (the `verify()` rewrite). The HTML change below adds the `required` visual indicator to the combobox.

**Important:** The `required` attribute on `lightning-combobox` is cosmetic — it displays a visual asterisk but does NOT prevent the custom `verify()` button handler from executing. The JS validation in `verify()` (Step 1.2b) is what actually enforces the requirement. Both are needed: the HTML `required` for visual indication, and the JS check for enforcement.

#### Change 1.6a — Add required attribute to Case Origin combobox

**File:** `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.html`

**Current code (lines 12-17):**
```html
                    <lightning-combobox name="caseOrigin"
                                        label="Case Origin"
                                        value={caseOriginValue}
                                        options={caseOriginOptions}
                                        onchange={handleCaseOriginChange}>
                    </lightning-combobox>
```

**Replace with:**
```html
                    <lightning-combobox name="caseOrigin"
                                        label="Case Origin"
                                        value={caseOriginValue}
                                        options={caseOriginOptions}
                                        required
                                        onchange={handleCaseOriginChange}>
                    </lightning-combobox>
```

---

### Step 1.7 — Pass ANI through the full data pipeline

This threads the caller's phone number (ANI) from the Genesys payload through Apex → VF Page → Parent LWC → Modal LWC to auto-fill the Caller Phone field.

#### Change 1.7a — Add ANI to redirect URLs in Apex

**File:** `force-app/main/default/classes/GenesysCTIExtensionClassV2.cls`

**Current code (lines 104-111):**
```apex
        // If Accounts are found, navigate to the Visualforce page
        if (!orderedAccountIds.isEmpty()) {
            String accountIdsJson = JSON.serialize(orderedAccountIds);
            String vfPageURL = '/apex/VerifyMemberVisualforcePage?ids=' + EncodingUtil.urlEncode(accountIdsJson, 'UTF-8');
            System.debug('Navigating to Visualforce page with URL: ' + vfPageURL);

            dataToReturn.put('url', vfPageURL);
            return JSON.serialize(dataToReturn);
        }
```

**Replace with:**
```apex
        // If Accounts are found, navigate to the Visualforce page
        if (!orderedAccountIds.isEmpty()) {
            String accountIdsJson = JSON.serialize(orderedAccountIds);
            String aniParam = (searchValue != null) ? '&ani=' + EncodingUtil.urlEncode(searchValue, 'UTF-8') : '';
            String vfPageURL = '/apex/VerifyMemberVisualforcePage?ids=' + EncodingUtil.urlEncode(accountIdsJson, 'UTF-8') + aniParam;
            System.debug('Navigating to Visualforce page with URL: ' + vfPageURL);

            dataToReturn.put('url', vfPageURL);
            return JSON.serialize(dataToReturn);
        }
```

**Current code (lines 164-170):**
```apex
        // If Healthcare Providers are found, navigate to the Visualforce page
        if (!orderedHCPIds.isEmpty()) {
            String hcpIdsJson = JSON.serialize(orderedHCPIds);
            String vfPageURL = '/apex/VerifyHealthcareProviderVisualforcePage?ids=' + EncodingUtil.urlEncode(hcpIdsJson, 'UTF-8');
            System.debug('Navigating to Visualforce page with URL: ' + vfPageURL);

            dataToReturn.put('url', vfPageURL);
            return JSON.serialize(dataToReturn);
```

**Replace with:**
```apex
        // If Healthcare Providers are found, navigate to the Visualforce page
        if (!orderedHCPIds.isEmpty()) {
            String hcpIdsJson = JSON.serialize(orderedHCPIds);
            String aniParam = (searchValue != null) ? '&ani=' + EncodingUtil.urlEncode(searchValue, 'UTF-8') : '';
            String vfPageURL = '/apex/VerifyHealthcareProviderVisualforcePage?ids=' + EncodingUtil.urlEncode(hcpIdsJson, 'UTF-8') + aniParam;
            System.debug('Navigating to Visualforce page with URL: ' + vfPageURL);

            dataToReturn.put('url', vfPageURL);
            return JSON.serialize(dataToReturn);
```

#### Change 1.7b — Read ANI parameter in Account page controller

**File:** `force-app/main/default/classes/GC_Account_PageController.cls`

**Current code (lines 2-3):**
```apex
    public List<Account> fetchedRecords { get; private set; }
    public String fetchedRecordsJson { get; private set; } // JSON string for the records
```

**Replace with:**
```apex
    public List<Account> fetchedRecords { get; private set; }
    public String fetchedRecordsJson { get; private set; } // JSON string for the records
    public String callerANI { get; private set; }
```

**Current code (line 7):**
```apex
        String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
```

**Replace with:**
```apex
        String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
        callerANI = ApexPages.currentPage().getParameters().get('ani');
```

#### Change 1.7c — Read ANI parameter in HCP page controller

**File:** `force-app/main/default/classes/GC_HealthcareProvider_PageController.cls`

**Current code (lines 2-3):**
```apex
    public List<HealthcareProvider> fetchedRecords {get; private set;}
    public String fetchedRecordsJson {get; private set;} //JSON string for the records
```

**Replace with:**
```apex
    public List<HealthcareProvider> fetchedRecords {get; private set;}
    public String fetchedRecordsJson {get; private set;} //JSON string for the records
    public String callerANI { get; private set; }
```

**Current code (line 7):**
```apex
        String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
```

**Replace with:**
```apex
        String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
        callerANI = ApexPages.currentPage().getParameters().get('ani');
```

#### Change 1.7d — Pass ANI from VF page to verifyMember LWC

**File:** `force-app/main/default/pages/VerifyMemberVisualforcePage.page`

**Current code (lines 34-36):**
```javascript
        $Lightning.createComponent(
            "c:verifyMember",
            { accounts: records },
```

**Replace with:**
```javascript
        $Lightning.createComponent(
            "c:verifyMember",
            { accounts: records, callerANI: '{!JSENCODE(callerANI)}' },
```

#### Change 1.7e — Pass ANI from VF page to verifyProvider LWC

**File:** `force-app/main/default/pages/VerifyHealthcareProviderVisualforcePage.page`

**Current code (lines 36-38):**
```javascript
        $Lightning.createComponent(
            "c:verifyProvider",
            { providers: records },
```

**Replace with:**
```javascript
        $Lightning.createComponent(
            "c:verifyProvider",
            { providers: records, callerANI: '{!JSENCODE(callerANI)}' },
```

#### Change 1.7f — Accept and forward ANI in verifyMember

**File:** `force-app/main/default/lwc/verifyMember/verifyMember.js`

**Current code (line 6):**
```javascript
    @api accounts = [];
```

**Replace with:**
```javascript
    @api accounts = [];
    @api callerANI = '';
```

**File:** `force-app/main/default/lwc/verifyMember/verifyMember.html`

**Current code (lines 54-58):**
```html
                    <c-member-verification-modal
                        account={selectedAccount}
                        interaction-id={interactionRecordId}
                        interaction-name={interactionName}
                        onclose={handleModalClose}>
                    </c-member-verification-modal>
```

**Replace with:**
```html
                    <c-member-verification-modal
                        account={selectedAccount}
                        interaction-id={interactionRecordId}
                        interaction-name={interactionName}
                        caller-a-n-i={callerANI}
                        onclose={handleModalClose}>
                    </c-member-verification-modal>
```

#### Change 1.7g — Accept and forward ANI in verifyProvider

**File:** `force-app/main/default/lwc/verifyProvider/verifyProvider.js`

**Current code (line 6):**
```javascript
    @api providers = []; // Array of healthcare providers passed from Visualforce
```

**Replace with:**
```javascript
    @api providers = []; // Array of healthcare providers passed from Visualforce
    @api callerANI = '';
```

**File:** `force-app/main/default/lwc/verifyProvider/verifyProvider.html`

After Step 1.5b, the modal tag is:
```html
                    <c-provider-verification-modal
                        healthcare-provider={selectedProvider}
                        interaction-id={interactionRecordId}
                        interaction-name={interactionName}
                        provider-id={selectedProviderId}
                        onclose={handleModalClose}>
                    </c-provider-verification-modal>
```

**Replace with:**
```html
                    <c-provider-verification-modal
                        healthcare-provider={selectedProvider}
                        interaction-id={interactionRecordId}
                        interaction-name={interactionName}
                        provider-id={selectedProviderId}
                        caller-a-n-i={callerANI}
                        onclose={handleModalClose}>
                    </c-provider-verification-modal>
```

#### Change 1.7h — Accept ANI and auto-fill Caller Phone in memberVerificationModal

**File:** `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.js`

**Current code (lines 12-14):**
```javascript
    @api account; // The data block containing the account recordId.
    @api interactionId;
    @api interactionName;
```

**Replace with:**
```javascript
    @api account; // The data block containing the account recordId.
    @api interactionId;
    @api interactionName;
    @api callerANI = '';
```

**Current code (lines 133-136):**
```javascript
    connectedCallback() {
        console.log('Account data on connected:', JSON.stringify(this.account));
        console.log('Interaction Name: ', this.interactionName );
    }
```

**Replace with:**
```javascript
    connectedCallback() {
        console.log('Account data on connected:', JSON.stringify(this.account));
        console.log('Interaction Name: ', this.interactionName);
        if (this.callerANI && !this.callerPhoneValue) {
            this.callerPhoneValue = this.callerANI;
        }
    }
```

#### Change 1.7i — Accept ANI and auto-fill Caller Phone in providerVerificationModal

**File:** `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.js`

**Current code (lines 11-14):**
```javascript
    @api healthcareProvider;
    @api interactionId;
    @api interactionName;
    @api providerId; // Add this to receive the providerId from the parent
```

**Replace with:**
```javascript
    @api healthcareProvider;
    @api interactionId;
    @api interactionName;
    @api providerId;
    @api callerANI = '';
```

**Current code (lines 84-89):**
```javascript
    connectedCallback() {
        console.log('HealthcareProvider data on connected:', JSON.stringify(this.healthcareProvider));
        console.log('Provider ID from parent:', this.providerId); // Verify providerId is received
        console.log('Interaction Name: ', this.interactionName);
        this.showVerificationSectionImmediately();
    }
```

**Replace with:**
```javascript
    connectedCallback() {
        console.log('HealthcareProvider data on connected:', JSON.stringify(this.healthcareProvider));
        console.log('Provider ID from parent:', this.providerId);
        console.log('Interaction Name: ', this.interactionName);
        if (this.callerANI && !this.callerPhoneNumber) {
            this.callerPhoneNumber = this.callerANI;
        }
        this.showVerificationSectionImmediately();
    }
```

---

## Phase 2: Best Practices Improvements

---

### Step 2.1 — Add try-catch to GenesysCTIExtensionClassV2

**File:** `force-app/main/default/classes/GenesysCTIExtensionClassV2.cls`

#### Change 2.1a — Wrap method body in try-catch

**Current code (line 8):**
```apex
    public String onScreenPop(String jsonData) {

        // Deserialize the inbound JSON data to a Map
        Map<String, Object> deserializedData = (Map<String, Object>) JSON.deserializeUntyped(jsonData);
```

**Replace with:**
```apex
    public String onScreenPop(String jsonData) {
        try {
        // Deserialize the inbound JSON data to a Map
        Map<String, Object> deserializedData = (Map<String, Object>) JSON.deserializeUntyped(jsonData);
```

**Current code (lines 175-178):**
```apex
        // If no specific conditions are met, default to the standard screen pop behavior
        dataToReturn.put('defaultScreenPop', true);
        return JSON.serialize(dataToReturn);
    }
```

**Replace with:**
```apex
        // If no specific conditions are met, default to the standard screen pop behavior
        dataToReturn.put('defaultScreenPop', true);
        return JSON.serialize(dataToReturn);

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'GenesysCTIExtensionClassV2.onScreenPop() failed: ' + e.getMessage());
            System.debug(LoggingLevel.ERROR, 'Stack trace: ' + e.getStackTraceString());
            System.debug(LoggingLevel.ERROR, 'Input jsonData: ' + jsonData);
            Map<String, Object> fallback = new Map<String, Object>();
            fallback.put('defaultScreenPop', true);
            return JSON.serialize(fallback);
        }
    }
```

---

### Step 2.2 — Guard RecordType query

**File:** `force-app/main/default/classes/GenesysCTIExtensionClassV2.cls`

#### Change 2.2a — Replace unprotected RecordType assignment

**Current code (lines 116-118):**
```apex
        // Create a variable to store the RecordTypeId for HCP(Supplier Location) and query the org based on Recordtype.Name
        RecordType rt = [SELECT Id FROM RecordType WHERE SObjectType = 'HealthcareProvider' AND Name = 'Supplier Location' LIMIT 1];
        String recordTypeId = rt.Id;
```

**Replace with:**
```apex
        // Create a variable to store the RecordTypeId for HCP(Supplier Location) and query the org based on Recordtype.Name
        List<RecordType> rtList = [SELECT Id FROM RecordType WHERE SObjectType = 'HealthcareProvider' AND Name = 'Supplier Location' LIMIT 1];
        if (rtList.isEmpty()) {
            System.debug(LoggingLevel.ERROR, 'RecordType "Supplier Location" not found for HealthcareProvider. Skipping provider search.');
            dataToReturn.put('defaultScreenPop', true);
            return JSON.serialize(dataToReturn);
        }
        String recordTypeId = rtList[0].Id;
```

---

### Step 2.3 — (DEFERRED) Populate Interaction records

No code changes. Deferred pending managed package schema inspection (`sf sobject describe UST_EPLUS__Interaction__c --target-org coaGenesys`).

---

### Step 2.4 — Replace hardcoded RecordType IDs in trigger (SEPARATE DEPLOYMENT)

**File:** `force-app/main/default/triggers/HealthcareProviderTrigger.trigger`

#### Change 2.4a — Dynamic RecordType resolution

**Current code (lines 2-4):**
```apex
    // Define record type IDs
    String triggeringRecordTypeId = '0125f000000iIQTAA2'; // Updated value: 0125f000000iIQTAA2 = value for Supplier Location in Production
    String searchingRecordTypeId = '0125f000000zJzmAAE'; // Updated value: 0125f000000zJzmAAE = value for Prospective Provider in Production
```

**Replace with:**
```apex
    // Dynamically resolve record type IDs with null guards
    Schema.RecordTypeInfo triggeringRTInfo = Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Supplier Location');
    Schema.RecordTypeInfo searchingRTInfo = Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Prospective Provider');

    if (triggeringRTInfo == null || searchingRTInfo == null) {
        System.debug(LoggingLevel.ERROR, 'HealthcareProviderTrigger: Required RecordTypes not found. '
            + 'Supplier Location found: ' + (triggeringRTInfo != null)
            + ', Prospective Provider found: ' + (searchingRTInfo != null));
        return;
    }

    Id triggeringRecordTypeId = triggeringRTInfo.getRecordTypeId();
    Id searchingRecordTypeId = searchingRTInfo.getRecordTypeId();
```

This resolves the correct IDs at runtime in any environment. The null guards prevent a NullPointerException if the RecordType names don't exist in the org and log a clear diagnostic message.

---

### Step 2.5 — Fix callerType combobox handler

The HTML change was already made in Step 1.4a (the `onchange` attribute was changed from `handleInputChange` to `handleCallerTypeChange` when we restructured the conditional block). Now we need the JS handler.

#### Change 2.5a — Add dedicated handler for Caller Type combobox

**File:** `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.js`

Add after the `handleIsCallingOnBehalfChange` method (after line 114):

```javascript

    handleCallerTypeChange(event) {
        this.callerTypeValue = event.detail.value;
    }
```

**Why this is needed:** The existing `handleInputChange` (line 116-119) uses `this[name] = value` where `name` comes from `event.target.name`. The combobox has `name="callerType"` but the tracked property is `callerTypeValue`. So `this["callerType"] = value` sets a non-reactive, non-tracked property. The dedicated handler correctly sets `this.callerTypeValue` using `event.detail.value` (the correct way to read a combobox value).

---

### Step 2.6 — Make sharing mode explicit

> **Security posture reminder:** This is an intentional "break glass" call center workflow. CSRs need unrestricted access to matched records and sensitive verification fields (SSN, DOB, TIN) to perform caller verification. Access to this workflow is controlled at the entry point via Genesys call center routing and Salesforce permission set assignments. See the Security Posture section in [genesysCodeAnalysisSummary.md](genesysCodeAnalysisSummary.md) (Decision 3) for full rationale.

#### Change 2.6a — GC_Account_PageController

**File:** `force-app/main/default/classes/GC_Account_PageController.cls`

**Current code (line 1):**
```apex
public class GC_Account_PageController {
```

**Replace with:**
```apex
public without sharing class GC_Account_PageController {
```

#### Change 2.6b — GC_HealthcareProvider_PageController

**File:** `force-app/main/default/classes/GC_HealthcareProvider_PageController.cls`

**Current code (line 1):**
```apex
public class GC_HealthcareProvider_PageController {
```

**Replace with:**
```apex
public without sharing class GC_HealthcareProvider_PageController {
```

---

### Step 2.7 — Add exception handling to VF page controllers

#### Change 2.7a — Wrap GC_Account_PageController constructor in try-catch

**File:** `force-app/main/default/classes/GC_Account_PageController.cls`

**Current code (lines 5-47):**
```apex
    public GC_Account_PageController() {
        // Retrieve the serialized list of IDs from the page parameter
        String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
        callerANI = ApexPages.currentPage().getParameters().get('ani');
        if (String.isNotBlank(recordIdsJson)) {
            // Deserialize the JSON string back to a list of IDs
            List<Id> recordIds = (List<Id>) JSON.deserialize(recordIdsJson, List<Id>.class);
            System.debug('Deserialized record IDs: ' + recordIds);

            // Query all records that match the list of IDs
            if (!recordIds.isEmpty()) {
                Map<Id, Account> accountMap = new Map<Id, Account>([
                    SELECT  Id,
                            Name,
                            Phone,
                            UST_EPLUS__Member_ID__c, UST_EPLUS__SSN_Masked__c,
                            PersonBirthdate, HealthCloudGA__BirthDate__pc, UST_EPLUS__PersonBirthDate__c,
                            PersonMailingStreet, PersonMailingCity, PersonMailingState,
                            PersonMailingPostalCode, PersonMailingCountry, Last_4_SSN_V2__c
                    FROM Account
                    WHERE Id IN :recordIds
                ]);

                // Preserve the order of the IDs
                fetchedRecords = new List<Account>();
                for (Id recordId : recordIds) {
                    if (accountMap.containsKey(recordId)) {
                        fetchedRecords.add(accountMap.get(recordId));
                    }
                }

                System.debug('The Fetched Records from GC_Account_Page_Controller = ' + fetchedRecords);
            }
        }

        // Initialize with an empty list if no records are found to avoid null reference errors in the Visualforce page
        if (fetchedRecords == null) {
            fetchedRecords = new List<Account>();
        }

        // Serialize the list to JSON for use in the Visualforce page
        fetchedRecordsJson = JSON.serialize(fetchedRecords);
        System.debug('Serialized fetched records JSON: ' + fetchedRecordsJson);
    }
```

**Replace with:**
```apex
    public GC_Account_PageController() {
        fetchedRecords = new List<Account>();
        try {
            // Retrieve the serialized list of IDs from the page parameter
            String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
            callerANI = ApexPages.currentPage().getParameters().get('ani');
            if (String.isNotBlank(recordIdsJson)) {
                // Deserialize the JSON string back to a list of IDs
                List<Id> recordIds = (List<Id>) JSON.deserialize(recordIdsJson, List<Id>.class);
                System.debug('Deserialized record IDs: ' + recordIds);

                // Query all records that match the list of IDs
                if (!recordIds.isEmpty()) {
                    Map<Id, Account> accountMap = new Map<Id, Account>([
                        SELECT  Id,
                                Name,
                                Phone,
                                UST_EPLUS__Member_ID__c, UST_EPLUS__SSN_Masked__c,
                                PersonBirthdate, HealthCloudGA__BirthDate__pc, UST_EPLUS__PersonBirthDate__c,
                                PersonMailingStreet, PersonMailingCity, PersonMailingState,
                                PersonMailingPostalCode, PersonMailingCountry, Last_4_SSN_V2__c
                        FROM Account
                        WHERE Id IN :recordIds
                    ]);

                    // Preserve the order of the IDs
                    for (Id recordId : recordIds) {
                        if (accountMap.containsKey(recordId)) {
                            fetchedRecords.add(accountMap.get(recordId));
                        }
                    }

                    System.debug('The Fetched Records from GC_Account_Page_Controller = ' + fetchedRecords);
                }
            }
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'GC_Account_PageController error: ' + e.getMessage());
        }

        // Serialize the list to JSON for use in the Visualforce page
        fetchedRecordsJson = JSON.serialize(fetchedRecords);
        System.debug('Serialized fetched records JSON: ' + fetchedRecordsJson);
    }
```

#### Change 2.7b — Wrap GC_HealthcareProvider_PageController constructor in try-catch

**File:** `force-app/main/default/classes/GC_HealthcareProvider_PageController.cls`

**Current code (lines 5-51):**
```apex
    public GC_HealthcareProvider_PageController() {
        // Retrieve the serialized list of IDs from the page parameter
        String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
        callerANI = ApexPages.currentPage().getParameters().get('ani');
        if (String.isNotBlank(recordIdsJson)) {
            // Deserialize the JSON string back to a list of IDs
            List<Id> recordIds = (List<Id>) JSON.deserialize(recordIdsJson, List<Id>.class);
            System.debug('Deserialized record IDs: ' + recordIds);

            // Query all records that match the list of IDs and preserve the order of recordIds
            if (!recordIds.isEmpty()) {
                Map<Id, HealthcareProvider> recordsMap = new Map<Id, HealthcareProvider>([
                    SELECT
                        Id,
                        Name,
                        UST_EPLUS__Provider_ID__c,
                        UST_EPLUS__Provider_Tax_ID__c,
                        UST_EPLUS__Provider_NPI__c,
                        UST_EPLUS__Provider_Status__c,
                        UST_EPLUS__Practice_Street_Address__c,
                        UST_EPLUS__Practice_City__c,
                        UST_EPLUS__Practice_State__c,
                        UST_EPLUS__Practice_ZIP_Code__c,
                        UST_EPLUS__Primary_Phone_Number__c
                    FROM HealthcareProvider
                    WHERE Id IN :recordIds
                ]);

                // Reorder the list based on the original order in recordIds
                fetchedRecords = new List<HealthcareProvider>();
                for (Id recordId : recordIds) {
                    if (recordsMap.containsKey(recordId)) {
                        fetchedRecords.add(recordsMap.get(recordId));
                    }
                }
                System.debug('Ordered Fetched Records: ' + fetchedRecords);
            }
        }

        // Initialize with an empty list if no records are found to avoid null reference errors in the Visualforce page
        if (fetchedRecords == null) {
            fetchedRecords = new List<HealthcareProvider>();
        }

        // Serialize the list to JSON for use in the Visualforce page
        fetchedRecordsJson = JSON.serialize(fetchedRecords);
        System.debug('Serialized fetched records JSON: ' + fetchedRecordsJson);
    }
```

**Replace with:**
```apex
    public GC_HealthcareProvider_PageController() {
        fetchedRecords = new List<HealthcareProvider>();
        try {
            // Retrieve the serialized list of IDs from the page parameter
            String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
            callerANI = ApexPages.currentPage().getParameters().get('ani');
            if (String.isNotBlank(recordIdsJson)) {
                // Deserialize the JSON string back to a list of IDs
                List<Id> recordIds = (List<Id>) JSON.deserialize(recordIdsJson, List<Id>.class);
                System.debug('Deserialized record IDs: ' + recordIds);

                // Query all records that match the list of IDs and preserve the order of recordIds
                if (!recordIds.isEmpty()) {
                    Map<Id, HealthcareProvider> recordsMap = new Map<Id, HealthcareProvider>([
                        SELECT
                            Id,
                            Name,
                            UST_EPLUS__Provider_ID__c,
                            UST_EPLUS__Provider_Tax_ID__c,
                            UST_EPLUS__Provider_NPI__c,
                            UST_EPLUS__Provider_Status__c,
                            UST_EPLUS__Practice_Street_Address__c,
                            UST_EPLUS__Practice_City__c,
                            UST_EPLUS__Practice_State__c,
                            UST_EPLUS__Practice_ZIP_Code__c,
                            UST_EPLUS__Primary_Phone_Number__c
                        FROM HealthcareProvider
                        WHERE Id IN :recordIds
                    ]);

                    // Reorder the list based on the original order in recordIds
                    for (Id recordId : recordIds) {
                        if (recordsMap.containsKey(recordId)) {
                            fetchedRecords.add(recordsMap.get(recordId));
                        }
                    }
                    System.debug('Ordered Fetched Records: ' + fetchedRecords);
                }
            }
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'GC_HealthcareProvider_PageController error: ' + e.getMessage());
        }

        // Serialize the list to JSON for use in the Visualforce page
        fetchedRecordsJson = JSON.serialize(fetchedRecords);
        System.debug('Serialized fetched records JSON: ' + fetchedRecordsJson);
    }
```

---

### Step 2.8 — (MERGED) Error feedback on save failure

No separate implementation. This was incorporated into Steps 1.1 and 1.2 — the save-before-close pattern includes error display and retry capability.

---

### Step 2.9 — Remove dead recursive modal template

**File:** `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.html`

#### Change 2.9a — Delete the dead modal template block

**Delete lines 125-141 entirely:**
```html
    <!-- Modal Structure remains the same -->
    <template if:true={isModalOpen}>
        <section role="dialog" tabindex="-1" aria-modal="true" class="slds-modal slds-fade-in-open">
            <div class="slds-modal__container">
                <header class="slds-modal__header">
                    <h2 id="modal-heading-01" class="slds-modal__title slds-hyphenate">Verify Member Information</h2>
                </header>
                <div class="slds-modal__content slds-p-around_medium" id="modal-content-id-1">
                    <c-member-verification-modal account={account} onclose={handleModalClose} onverified={handleMemberVerified}></c-member-verification-modal>
                </div>
                <footer class="slds-modal__footer">
                    <lightning-button variant="neutral" label="Cancel" title="Cancel" onclick={handleModalClose}></lightning-button>
                </footer>
            </div>
        </section>
        <div class="slds-backdrop slds-backdrop_open"></div>
    </template>
```

The `</template>` closing tag on line 142 remains — it closes the root `<template>` that opens on line 1.

---

## Phase 3: Cleanup

---

### Step 3.1 — Add JSENCODE to VF pages

#### Change 3.1a — Member VF page

**File:** `force-app/main/default/pages/VerifyMemberVisualforcePage.page`

**Current code (line 13):**
```javascript
        var fetchedRecords = JSON.parse('{!fetchedRecordsJson}');
```

**Replace with:**
```javascript
        var fetchedRecords = JSON.parse('{!JSENCODE(fetchedRecordsJson)}');
```

#### Change 3.1b — Provider VF page

**File:** `force-app/main/default/pages/VerifyHealthcareProviderVisualforcePage.page`

**Current code (line 16):**
```javascript
        var fetchedRecords = JSON.parse('{!fetchedRecordsJson}');
```

**Replace with:**
```javascript
        var fetchedRecords = JSON.parse('{!JSENCODE(fetchedRecordsJson)}');
```

---

### Step 3.2 — Move trigger logic to handler class

#### Change 3.2a — Create HealthcareProviderTriggerHandler class

**New file:** `force-app/main/default/classes/HealthcareProviderTriggerHandler.cls`

```apex
public without sharing class HealthcareProviderTriggerHandler {

    public static void handleAfterInsert(List<HealthcareProvider> newRecords) {
        // Dynamically resolve record type IDs with null guards
        Schema.RecordTypeInfo triggeringRTInfo = Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Supplier Location');
        Schema.RecordTypeInfo searchingRTInfo = Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Prospective Provider');

        if (triggeringRTInfo == null || searchingRTInfo == null) {
            System.debug(LoggingLevel.ERROR, 'HealthcareProviderTriggerHandler: Required RecordTypes not found. '
                + 'Supplier Location found: ' + (triggeringRTInfo != null)
                + ', Prospective Provider found: ' + (searchingRTInfo != null));
            return;
        }

        Id triggeringRecordTypeId = triggeringRTInfo.getRecordTypeId();
        Id searchingRecordTypeId = searchingRTInfo.getRecordTypeId();

        // Create a set of NPI values for the new records that have the specified record type
        Set<String> npiValues = new Set<String>();
        List<Id> idsToDelete = new List<Id>();

        for (HealthcareProvider hcp : newRecords) {
            if (hcp.RecordTypeId == triggeringRecordTypeId) {
                npiValues.add(hcp.UST_EPLUS__Provider_NPI__c);
            }
        }

        // If we have any NPI values to search for, proceed
        if (!npiValues.isEmpty()) {
            // Query for existing records with the searching record type and matching NPI values
            List<HealthcareProvider> matchingRecords = [
                SELECT Id, RecordTypeId, UST_EPLUS__Provider_NPI__c
                FROM HealthcareProvider
                WHERE UST_EPLUS__Provider_NPI__c IN :npiValues
                AND RecordTypeId = :searchingRecordTypeId
            ];

            // If matches are found based on NPI, update the matched records and schedule the deletion of the triggering records
            if (!matchingRecords.isEmpty()) {
                // Modify the record type of the matching records
                for (HealthcareProvider hcp : matchingRecords) {
                    hcp.RecordTypeId = triggeringRecordTypeId;
                }
                update matchingRecords;

                // Add the triggering records to the deletion list
                for (HealthcareProvider hcp : newRecords) {
                    if (hcp.RecordTypeId == triggeringRecordTypeId) {
                        idsToDelete.add(hcp.Id);
                    }
                }

                // Enqueue the delayed deletion job
                if (!idsToDelete.isEmpty()) {
                    System.enqueueJob(new DelayedDeleteHandler(idsToDelete));
                }
            }
        }
    }
}
```

**New file:** `force-app/main/default/classes/HealthcareProviderTriggerHandler.cls-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>59.0</apiVersion>
    <status>Active</status>
</ApexClass>
```

#### Change 3.2b — Simplify the trigger to delegate

**File:** `force-app/main/default/triggers/HealthcareProviderTrigger.trigger`

**Replace the entire file contents with:**
```apex
trigger HealthcareProviderTrigger on HealthcareProvider (after insert) {
    HealthcareProviderTriggerHandler.handleAfterInsert(Trigger.new);
}
```

---

### Step 3.3 — Improve error logging in DelayedDeleteHandler

**File:** `force-app/main/default/classes/DelayedDeleteHandler.cls`

**Current code (lines 8-15):**
```apex
    public void execute(QueueableContext context) {
        try {
            delete [SELECT Id FROM HealthcareProvider WHERE Id IN :idsToDelete];
        } catch(Exception e) {
            System.debug('Error deleting records: ' + e.getMessage());
            // Handle the exception or log as required
        }
    }
```

**Replace with:**
```apex
    public void execute(QueueableContext context) {
        try {
            delete [SELECT Id FROM HealthcareProvider WHERE Id IN :idsToDelete];
        } catch(Exception e) {
            System.debug(LoggingLevel.ERROR, 'DelayedDeleteHandler failed for IDs: ' + idsToDelete + ' | Error: ' + e.getMessage());
        }
    }
```

---

### Step 3.4 — Remove @track from primitives

#### Change 3.4a — memberVerificationModal.js

**File:** `force-app/main/default/lwc/memberVerificationModal/memberVerificationModal.js`

Remove `@track` from all primitive property declarations. Keep `@track` on `checkedValues` (array).

**Current code (lines 15-31):**
```javascript
    @track checkedValues = []; // Tracks the values of checked checkboxes.
    @track masterAccountId = ''; // Stores the extracted recordId from the account data.
    @track showDropdowns = true; // Controls the initial display of the dropdowns.
    @track showVerificationSection = false; // Controls the display of the verification section after selections.
    @track caseOriginValue = ''; // Stores the selected Case Origin value.
    @track memberTypeValue = ''; // Stores the selected Member Type value.
    @track representativeTypeValue = ''; // New: Stores the selected Representative Type value.
    @track relationshipTypeValue = ''; // New: Stores the selected Relationship Type value.
    @track showRepresentativeDetails = false; // New: Controls the display of the Representative Details section.
    @track showRelationshipType = false; // New: Controls the display of the Relationship Type dropdown.
    @track showAdditionalFields = false; // New: Controls the display of the additional fields section.
    @track nameValue = ''; // New: Stores the entered Name value.
    @track callerPhoneValue = ''; // New: Stores the entered Caller Phone value.
    @track descriptionValue = ''; // New: Stores the entered Description value.
    @track isSaving = false;
    @track errorMessage = '';
```

**Replace with:**
```javascript
    @track checkedValues = [];
    masterAccountId = '';
    showDropdowns = true;
    showVerificationSection = false;
    caseOriginValue = '';
    memberTypeValue = '';
    representativeTypeValue = '';
    relationshipTypeValue = '';
    showRepresentativeDetails = false;
    showRelationshipType = false;
    showAdditionalFields = false;
    nameValue = '';
    callerPhoneValue = '';
    descriptionValue = '';
    isSaving = false;
    errorMessage = '';
```

#### Change 3.4b — providerVerificationModal.js

**File:** `force-app/main/default/lwc/providerVerificationModal/providerVerificationModal.js`

**Current code (lines 16-24):**
```javascript
    @track checkedValues = [];
    @track caseOriginValue = '';
    @track isCallingOnBehalf = false;
    @track callerName = '';
    @track callerTypeValue = '';
    @track callerPhoneNumber = '';
    @track phoneExtension = '';
    @track isSaving = false;
    @track errorMessage = '';
```

**Replace with:**
```javascript
    @track checkedValues = [];
    caseOriginValue = '';
    isCallingOnBehalf = false;
    callerName = '';
    callerTypeValue = '';
    callerPhoneNumber = '';
    phoneExtension = '';
    isSaving = false;
    errorMessage = '';
```

#### Change 3.4c — verifyMember.js

**File:** `force-app/main/default/lwc/verifyMember/verifyMember.js`

**Current code (lines 7-11):**
```javascript
    @track isModalOpen = false;
    @track selectedAccountId = null;
    @track interactionRecordId = null;
    @track interactionName = null;
    @track verificationData = {}; // To store temporary verification data
```

**Replace with:**
```javascript
    isModalOpen = false;
    selectedAccountId = null;
    interactionRecordId = null;
    interactionName = null;
    @track verificationData = {};
```

#### Change 3.4d — verifyProvider.js

**File:** `force-app/main/default/lwc/verifyProvider/verifyProvider.js`

**Current code (lines 7-10):**
```javascript
    @track isModalOpen = false;
    @track selectedProviderId = null;
    @track interactionRecordId = null;
    @track interactionName = null;
```

**Replace with:**
```javascript
    isModalOpen = false;
    selectedProviderId = null;
    interactionRecordId = null;
    interactionName = null;
```

Also remove `track` from the import on line 1 of `verifyProvider.js`:

**Current:**
```javascript
import { LightningElement, api, track } from 'lwc';
```

**Replace with:**
```javascript
import { LightningElement, api } from 'lwc';
```

---

### Step 3.5 — Remove or archive legacy screen pop classes

**Files to mark as deprecated:**
- `force-app/main/default/classes/GenesysCTIExtensionClass.cls`
- `force-app/main/default/classes/MyScreenPopExtension5.cls`
- `force-app/main/default/classes/MyScreenPopExtension6.cls`
- `force-app/main/default/classes/MyScreenPopExtension7.cls`

Add to the first line of each file (after the class declaration line), before any existing code:

```apex
// DEPRECATED - replaced by GenesysCTIExtensionClassV2. Do not activate.
```

**Action required:** Before deleting, confirm with the Genesys Cloud Call Center configuration that only `GenesysCTIExtensionClassV2` is referenced as the active extension class. If confirmed, the classes and their test classes can be deleted entirely.

---

### Step 3.6 — Add SOQL LIMIT clauses

**File:** `force-app/main/default/classes/GenesysCTIExtensionClassV2.cls`

Add `LIMIT 50` to each of the six SOQL queries:

**Line 68 — Account both matches:**

**Current:**
```apex
            List<Account> bothMatchAccounts = [SELECT Id FROM Account WHERE Phone = :searchValue AND Last_4_SSN_V2__c = :sf_last4SSN];
```

**Replace with:**
```apex
            List<Account> bothMatchAccounts = [SELECT Id FROM Account WHERE Phone = :searchValue AND Last_4_SSN_V2__c = :sf_last4SSN LIMIT 50];
```

**Line 78 — Account SSN matches:**

**Current:**
```apex
            List<Account> ssnMatchAccounts = [SELECT Id FROM Account WHERE Last_4_SSN_V2__c = :sf_last4SSN AND Id NOT IN :bothMatches];
```

**Replace with:**
```apex
            List<Account> ssnMatchAccounts = [SELECT Id FROM Account WHERE Last_4_SSN_V2__c = :sf_last4SSN AND Id NOT IN :bothMatches LIMIT 50];
```

**Line 88 — Account phone matches:**

**Current:**
```apex
            List<Account> phoneMatchAccounts = [SELECT Id FROM Account WHERE Phone = :searchValue AND Id NOT IN :bothMatches];
```

**Replace with:**
```apex
            List<Account> phoneMatchAccounts = [SELECT Id FROM Account WHERE Phone = :searchValue AND Id NOT IN :bothMatches LIMIT 50];
```

**Line 128 — HCP both matches:**

**Current:**
```apex
            List<HealthcareProvider> bothMatchHCPs = [SELECT Id FROM HealthcareProvider WHERE UST_EPLUS__Primary_Phone_Number__c = :searchValue AND UST_EPLUS__Provider_NPI__c = :sf_NPI AND RecordTypeId = :recordTypeId];
```

**Replace with:**
```apex
            List<HealthcareProvider> bothMatchHCPs = [SELECT Id FROM HealthcareProvider WHERE UST_EPLUS__Primary_Phone_Number__c = :searchValue AND UST_EPLUS__Provider_NPI__c = :sf_NPI AND RecordTypeId = :recordTypeId LIMIT 50];
```

**Line 138 — HCP NPI matches:**

**Current:**
```apex
            List<HealthcareProvider> npiMatchHCPs = [SELECT Id FROM HealthcareProvider WHERE UST_EPLUS__Provider_NPI__c = :sf_NPI AND RecordTypeId = :recordTypeId AND Id NOT IN :bothHCPMatches];
```

**Replace with:**
```apex
            List<HealthcareProvider> npiMatchHCPs = [SELECT Id FROM HealthcareProvider WHERE UST_EPLUS__Provider_NPI__c = :sf_NPI AND RecordTypeId = :recordTypeId AND Id NOT IN :bothHCPMatches LIMIT 50];
```

**Line 148 — HCP phone matches:**

**Current:**
```apex
            List<HealthcareProvider> phoneMatchHCPs = [SELECT Id FROM HealthcareProvider WHERE UST_EPLUS__Primary_Phone_Number__c = :searchValue AND RecordTypeId = :recordTypeId AND Id NOT IN :bothHCPMatches];
```

**Replace with:**
```apex
            List<HealthcareProvider> phoneMatchHCPs = [SELECT Id FROM HealthcareProvider WHERE UST_EPLUS__Primary_Phone_Number__c = :searchValue AND RecordTypeId = :recordTypeId AND Id NOT IN :bothHCPMatches LIMIT 50];
```

---

### Step 3.7 — Remove unused class-level variables

**File:** `force-app/main/default/classes/GenesysCTIExtensionClassV2.cls`

#### Change 3.7a — Remove declarations

**Current code (lines 2-6):**
```apex
    // Class-level variables to store parsed values
    public String sf_last4SSN;
    public String sf_ANI;
    public String sf_RecordId;
    public String sf_NPI;
```

**Replace with:**
```apex
    // Class-level variables to store parsed values
    public String sf_last4SSN;
    public String sf_NPI;
```

#### Change 3.7b — Remove assignments (but keep the debug statements for context)

**Current code (lines 37-41):**
```apex
        sf_ANI = sfSearchValueData.containsKey('ANI') ? (String) sfSearchValueData.get('ANI') : null;
        System.debug('The ANI value from the interaction payload is: ' + sf_ANI);

        sf_RecordId = sfSearchValueData.containsKey('RecordID') ? (String) sfSearchValueData.get('RecordID') : null;
        System.debug('The SF Record Id from the interaction payload is: ' + sf_RecordId);
```

**Replace with (remove the variable assignments; keep debug with local extraction if needed for debugging, or simply remove both lines):**
```apex
        // sf_ANI and sf_RecordId extracted from payload but not used downstream — removed
```

---

### Step 3.8 — (DEFERRED) Phone normalization

No code changes. Deferred until evidence of format mismatches between Genesys and Salesforce phone number formats.

---

## Test Class Updates

---

### TestGenesysCTIExtensionClassV2 updates

**File:** `force-app/main/default/classes/TestGenesysCTIExtensionClassV2.cls`

These updates ensure the test class validates the new ANI parameter and the try-catch behavior introduced in Steps 1.7a, 2.1, and 2.2.

#### Change T1a — Add test for ANI parameter in member URL

Add the following test method after the `testNPIAndSSN` method (after line 181):

```apex

    @isTest
    static void testANIPassedInMemberURL() {
        Account testAcc = createTestAccount('1234567890', '1234');

        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "1234567890", "interaction": {"attributes": {"sf_searchvalue": "{\\"Last4SSN\\":\\"1234\\"}"}}}';
        String result = extension.onScreenPop(jsonData);

        System.assertNotEquals(null, result, 'Result should not be null.');
        System.assert(result.contains('VerifyMemberVisualforcePage'), 'Result should contain member VF page URL.');
        System.assert(result.contains('ani='), 'Result should contain ANI parameter in the URL.');
    }

    @isTest
    static void testANIPassedInProviderURL() {
        HealthcareProvider testHCP = createTestHealthcareProvider('1234567890', '1111111111');

        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "1234567890", "interaction": {"attributes": {"sf_searchvalue": "{\\"NPI\\":\\"1111111111\\"}"}}}';
        String result = extension.onScreenPop(jsonData);

        System.assertNotEquals(null, result, 'Result should not be null.');
        System.assert(result.contains('VerifyHealthcareProviderVisualforcePage'), 'Result should contain provider VF page URL.');
        System.assert(result.contains('ani='), 'Result should contain ANI parameter in the URL.');
    }

    @isTest
    static void testMalformedJsonFallsBackToDefaultScreenPop() {
        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = 'this is not valid JSON';
        String result = extension.onScreenPop(jsonData);

        System.assertNotEquals(null, result, 'Result should not be null even with malformed JSON.');
        System.assert(result.contains('defaultScreenPop'), 'Result should indicate default screen pop on malformed JSON.');
    }

    @isTest
    static void testNullSearchValueNoANI() {
        Account testAcc = createTestAccount('5555555555', '9999');

        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        // searchValue is null, but sf_last4SSN matches
        String jsonData = '{"interaction": {"attributes": {"sf_searchvalue": "{\\"Last4SSN\\":\\"9999\\"}"}}}';
        String result = extension.onScreenPop(jsonData);

        System.assertNotEquals(null, result, 'Result should not be null.');
        // Should still find the account via SSN-only match
        System.assert(result.contains(testAcc.Id), 'Result should contain the Account ID from SSN-only match.');
        // URL should not contain ani= since searchValue was null
        System.assert(!result.contains('ani='), 'Result should not contain ANI parameter when searchValue is null.');
    }
```

---

### Test_GC_Account_PageController updates

**File:** `force-app/main/default/classes/Test_GC_Account_PageController.cls`

#### Change T2a — Add test for ANI parameter and error handling

Add the following test methods after the `testControllerWithoutIds` method (after line 63):

```apex

    @isTest
    static void testControllerWithANI() {
        List<Id> accountIds = createTestAccounts();

        Test.setCurrentPage(new PageReference('Page.dummyPage'));
        ApexPages.currentPage().getParameters().put('ids', JSON.serialize(accountIds));
        ApexPages.currentPage().getParameters().put('ani', '3035551234');

        GC_Account_PageController controller = new GC_Account_PageController();

        System.assertEquals(2, controller.fetchedRecords.size(), 'Should fetch exactly two records.');
        System.assertEquals('3035551234', controller.callerANI, 'ANI should be captured from URL parameter.');
    }

    @isTest
    static void testControllerWithMalformedIds() {
        Test.setCurrentPage(new PageReference('Page.dummyPage'));
        ApexPages.currentPage().getParameters().put('ids', 'not-valid-json');

        GC_Account_PageController controller = new GC_Account_PageController();

        System.assertEquals(0, controller.fetchedRecords.size(), 'Should handle malformed JSON gracefully.');
        System.assertNotEquals(null, controller.fetchedRecordsJson, 'Serialized JSON should still not be null.');
    }
```

---

### Test_GC_HCPPageController updates

**File:** `force-app/main/default/classes/Test_GC_HCPPageController.cls`

#### Change T3a — Add test for ANI parameter and error handling

Add the following test methods after the `testControllerWithNoIds` method (after line 68):

```apex

    @isTest
    static void testControllerWithANI() {
        setupTriggerSettings();
        HealthcareProvider testHCP = createTestHealthcareProvider();

        Test.setCurrentPage(Page.VerifyHealthcareProviderVisualforcePage);
        List<Id> ids = new List<Id>{testHCP.Id};
        ApexPages.currentPage().getParameters().put('ids', JSON.serialize(ids));
        ApexPages.currentPage().getParameters().put('ani', '7205559876');

        GC_HealthcareProvider_PageController controller = new GC_HealthcareProvider_PageController();

        System.assertEquals(1, controller.fetchedRecords.size(), 'Should fetch one record.');
        System.assertEquals('7205559876', controller.callerANI, 'ANI should be captured from URL parameter.');
    }

    @isTest
    static void testControllerWithMalformedIds() {
        setupTriggerSettings();

        Test.setCurrentPage(Page.VerifyHealthcareProviderVisualforcePage);
        ApexPages.currentPage().getParameters().put('ids', 'invalid-json-data');

        GC_HealthcareProvider_PageController controller = new GC_HealthcareProvider_PageController();

        System.assertEquals(0, controller.fetchedRecords.size(), 'Should handle malformed JSON gracefully.');
        System.assertNotEquals(null, controller.fetchedRecordsJson, 'Serialized JSON should still not be null.');
    }
```

---

### testHealthcareProviderTrigger updates (SEPARATE DEPLOYMENT)

**File:** `force-app/main/default/classes/testHealthcareProviderTrigger.cls`

This test class also has hardcoded RecordType IDs that must be replaced with dynamic resolution, matching the trigger fix in Step 2.4.

#### Change T4a — Replace hardcoded RecordType IDs with dynamic resolution

**Current code (lines 3-5):**
```apex

    static final String triggeringRecordTypeId = '0125f000000iIQTAA2'; //this is supplier location
    static final String searchingRecordTypeId = '0125f000000zJzmAAE'; //this is prospective provider
```

**Replace with:**
```apex

    static Id triggeringRecordTypeId {
        get {
            return Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Supplier Location').getRecordTypeId();
        }
    }
    static Id searchingRecordTypeId {
        get {
            return Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Prospective Provider').getRecordTypeId();
        }
    }
```

**Note:** Changed from `static final` field initializers to getter properties because `static final` fields in test classes are evaluated at class load time, and `Schema.SObjectType` calls in that context can behave inconsistently in some test execution environments. Getter properties ensure the resolution happens at access time within the test method context.

---

### New test class: HealthcareProviderTriggerHandlerTest

This test class is needed if Step 3.2 (trigger handler) is implemented. It should be deployed alongside the handler class.

**New file:** `force-app/main/default/classes/HealthcareProviderTriggerHandlerTest.cls`

```apex
@isTest
private class HealthcareProviderTriggerHandlerTest {

    private static void setupTriggerSettings() {
        List<UST_EPLUS__TriggerSettings__c> settings = new List<UST_EPLUS__TriggerSettings__c>{
            new UST_EPLUS__TriggerSettings__c(Name='AllTrigger', UST_EPLUS__RunTrigger__c=false),
            new UST_EPLUS__TriggerSettings__c(Name='EPHealthcareProviderTrigger', UST_EPLUS__RunTrigger__c=false)
        };
        insert settings;
    }

    @isTest
    static void testHandlerWithMatchingNPI() {
        setupTriggerSettings();

        Id searchingRecordTypeId = Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Prospective Provider').getRecordTypeId();
        Id triggeringRecordTypeId = Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Supplier Location').getRecordTypeId();

        // Create a Prospective Provider record
        HealthcareProvider prospective = new HealthcareProvider(
            RecordTypeId = searchingRecordTypeId,
            Name = 'Prospective Provider Test',
            UST_EPLUS__Provider_NPI__c = '7777777777'
        );
        insert prospective;

        // Insert a Supplier Location with the same NPI — trigger should fire
        Test.startTest();
        HealthcareProvider incoming = new HealthcareProvider(
            RecordTypeId = triggeringRecordTypeId,
            Name = 'Incoming Supplier Location',
            UST_EPLUS__Provider_NPI__c = '7777777777'
        );
        insert incoming;
        Test.stopTest();

        // Verify the prospective provider was promoted to Supplier Location
        HealthcareProvider updatedProspective = [SELECT RecordTypeId FROM HealthcareProvider WHERE Id = :prospective.Id];
        System.assertEquals(triggeringRecordTypeId, updatedProspective.RecordTypeId, 'Prospective Provider should be promoted to Supplier Location.');
    }

    @isTest
    static void testHandlerWithNoMatch() {
        setupTriggerSettings();

        Id triggeringRecordTypeId = Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Supplier Location').getRecordTypeId();

        // Insert a Supplier Location with no matching Prospective Provider
        Test.startTest();
        HealthcareProvider incoming = new HealthcareProvider(
            RecordTypeId = triggeringRecordTypeId,
            Name = 'No Match Provider',
            UST_EPLUS__Provider_NPI__c = '9999999999'
        );
        insert incoming;
        Test.stopTest();

        // Verify the record still exists (no deletion scheduled since no match)
        List<HealthcareProvider> remaining = [SELECT Id FROM HealthcareProvider WHERE Id = :incoming.Id];
        System.assertEquals(1, remaining.size(), 'Record should still exist when no matching Prospective Provider found.');
    }
}
```

**New file:** `force-app/main/default/classes/HealthcareProviderTriggerHandlerTest.cls-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>59.0</apiVersion>
    <status>Active</status>
</ApexClass>
```

---

## Deployment Manifest

### Phase 1 Deploy (Call Flow Bug Fixes)

All Phase 1 and Phase 2 changes (except Step 2.4) deploy together.

**Apex Classes:**
- `force-app/main/default/classes/GenesysCTIExtensionClassV2.cls` (Steps 1.7a, 2.1, 2.2, 3.6, 3.7)
- `force-app/main/default/classes/GC_Account_PageController.cls` (Steps 1.7b, 2.6a, 2.7a)
- `force-app/main/default/classes/GC_HealthcareProvider_PageController.cls` (Steps 1.7c, 2.6b, 2.7b)
- `force-app/main/default/classes/DelayedDeleteHandler.cls` (Step 3.3)
- `force-app/main/default/classes/TestGenesysCTIExtensionClassV2.cls` (Test updates)
- `force-app/main/default/classes/Test_GC_Account_PageController.cls` (Test updates)
- `force-app/main/default/classes/Test_GC_HCPPageController.cls` (Test updates)

**Visualforce Pages:**
- `force-app/main/default/pages/VerifyMemberVisualforcePage.page` (Steps 1.7d, 3.1a)
- `force-app/main/default/pages/VerifyHealthcareProviderVisualforcePage.page` (Steps 1.7e, 3.1b)

**LWC Bundles:**
- `force-app/main/default/lwc/verifyMember/` (Steps 1.7f, 3.4c)
- `force-app/main/default/lwc/verifyProvider/` (Steps 1.5, 1.7g, 3.4d)
- `force-app/main/default/lwc/memberVerificationModal/` (Steps 1.1, 1.3, 1.7h, 2.9, 3.4a)
- `force-app/main/default/lwc/providerVerificationModal/` (Steps 1.2, 1.4, 1.6, 1.7i, 2.5, 3.4b)

### Separate Deploy (Trigger Fix)

**Trigger + Handler + Tests:**
- `force-app/main/default/triggers/HealthcareProviderTrigger.trigger` (Steps 2.4, 3.2b)
- `force-app/main/default/classes/HealthcareProviderTriggerHandler.cls` (Step 3.2a) — **new file**
- `force-app/main/default/classes/HealthcareProviderTriggerHandler.cls-meta.xml` — **new file**
- `force-app/main/default/classes/testHealthcareProviderTrigger.cls` (Step T4a)
- `force-app/main/default/classes/HealthcareProviderTriggerHandlerTest.cls` — **new file**
- `force-app/main/default/classes/HealthcareProviderTriggerHandlerTest.cls-meta.xml` — **new file**

### Deferred (No deployment)
- Step 2.3 — Populate Interaction records (pending managed package schema inspection)
- Step 3.8 — Phone normalization (pending evidence of format mismatches)
- DOB display inconsistency in `memberVerificationModal.js` — The `formattedDateOfBirth` getter (lines 117-131) uses a regex matching `"Month Day, Year"` format (e.g., "January 15, 2000"), but Salesforce Date fields serialized via `JSON.serialize()` produce ISO format ("2000-01-15"). The getter returns empty string, causing the DOB to display as blank in the modal. Low severity — the DOB data is still present for the verification checkbox to enable correctly. Fix: replace the regex formatter with an ISO-aware date parser using `new Date()`. Deferred because it is a display-only issue that does not affect data capture or verification logic.

---

## Complete File Change Summary

| File | Steps Applied | Type |
|---|---|---|
| `GenesysCTIExtensionClassV2.cls` | 1.7a, 2.1, 2.2, 3.6, 3.7 | Modified |
| `GC_Account_PageController.cls` | 1.7b, 2.6a, 2.7a | Modified |
| `GC_HealthcareProvider_PageController.cls` | 1.7c, 2.6b, 2.7b | Modified |
| `DelayedDeleteHandler.cls` | 3.3 | Modified |
| `VerifyMemberVisualforcePage.page` | 1.7d, 3.1a | Modified |
| `VerifyHealthcareProviderVisualforcePage.page` | 1.7e, 3.1b | Modified |
| `verifyMember.js` | 1.7f, 3.4c | Modified |
| `verifyMember.html` | 1.7f | Modified |
| `verifyProvider.js` | 1.5a, 1.7g, 3.4d | Modified |
| `verifyProvider.html` | 1.5b, 1.7g | Modified |
| `memberVerificationModal.js` | 1.1a-c, 1.1e, 1.3, 1.7h, 3.4a | Modified |
| `memberVerificationModal.html` | 1.1d, 1.3a, 2.9a | Modified |
| `providerVerificationModal.js` | 1.2a-c, 1.2e, 1.4, 1.7i, 2.5a, 3.4b | Modified |
| `providerVerificationModal.html` | 1.2d, 1.4a, 1.6a | Modified |
| `HealthcareProviderTrigger.trigger` | 2.4, 3.2b | Modified (separate deploy) |
| `HealthcareProviderTriggerHandler.cls` | 3.2a | **New file** (separate deploy) |
| `HealthcareProviderTriggerHandler.cls-meta.xml` | 3.2a | **New file** (separate deploy) |
| `TestGenesysCTIExtensionClassV2.cls` | T1a | Modified |
| `Test_GC_Account_PageController.cls` | T2a | Modified |
| `Test_GC_HCPPageController.cls` | T3a | Modified |
| `testHealthcareProviderTrigger.cls` | T4a | Modified (separate deploy) |
| `HealthcareProviderTriggerHandlerTest.cls` | New | **New file** (separate deploy) |
| `HealthcareProviderTriggerHandlerTest.cls-meta.xml` | New | **New file** (separate deploy) |
