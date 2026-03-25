<!-- PLAN QUALITY: All plan quality concerns have been resolved as of 2026-02-25T12:12:00Z -->
# Genesys Call System - Complete Code Analysis

## Table of Contents

1. [System Overview](#system-overview)
2. [Known Issues Under Investigation](#known-issues-under-investigation)
3. [Complete Asset Inventory](#complete-asset-inventory)
4. [Execution Flow Diagram](#execution-flow-diagram)
5. [File-by-File Analysis](#file-by-file-analysis)
   - [GenesysCTIExtensionClassV2.cls (ACTIVE)](#genesysctiextensionclassv2cls-active)
   - [GenesysCTIExtensionClass.cls (Legacy V1)](#genesysctiextensionclasscls-legacy-v1)
   - [MyScreenPopExtension7.cls (Legacy)](#myscreenpopextension7cls-legacy)
   - [MyScreenPopExtension6.cls (Legacy)](#myscreenpopextension6cls-legacy)
   - [MyScreenPopExtension5.cls (Legacy)](#myscreenpopextension5cls-legacy)
   - [GC_Account_PageController.cls](#gc_account_pagecontrollercls)
   - [GC_HealthcareProvider_PageController.cls](#gc_healthcareprovider_pagecontrollercls)
   - [VerifyMemberVisualforcePage.page](#verifymembervisualforcepagepage)
   - [VerifyHealthcareProviderVisualforcePage.page](#verifyhealthcareprovidervisualforcepagepage)
   - [MyLWCApp (Aura)](#mylwcapp-aura)
   - [MyProviderLWCApp (Aura)](#myproviderlwcapp-aura)
   - [verifyMember (LWC)](#verifymember-lwc)
   - [verifyProvider (LWC)](#verifyprovider-lwc)
   - [memberVerificationModal (LWC)](#memberverificationmodal-lwc)
   - [providerVerificationModal (LWC)](#providerverificationmodal-lwc)
   - [HealthcareProviderTrigger.trigger](#healthcareprovidertriggertrigger)
   - [DelayedDeleteHandler.cls](#delayeddeletehandlercls)
   - [e2e_HCP_Main (LWC)](#e2e_hcp_main-lwc)
   - [ExportToExcelControllerHCP.cls](#exporttoexcelcontrollerhcpcls)
6. [Root Cause Analysis: Verification Information Not Logging Caller Data](#root-cause-analysis-verification-information-not-logging-caller-data)
7. [Salesforce Best Practices Violations Summary](#salesforce-best-practices-violations-summary)
8. [Related Flows](#related-flows)
9. [Remediation Plan](#remediation-plan)

---

## System Overview

This system integrates Genesys Cloud (PureCloud) telephony with Salesforce Health Cloud. When an inbound phone call arrives, Genesys passes call metadata (ANI/phone number, IVR-collected data like Last 4 SSN or NPI) to Salesforce via the `purecloud.CTIExtension.ScreenPop` interface. The custom Apex class parses this data, searches for matching Member (Account) or Provider (HealthcareProvider) records, and "screen pops" a verification page where the CSR confirms the caller's identity before being navigated to the record.

**Technology Stack:**
- Genesys Cloud (PureCloud) managed package (`purecloud` namespace)
- Apex classes implementing `purecloud.CTIExtension.ScreenPop`
- Visualforce pages using Lightning Out (`$Lightning.use`)
- Aura application wrappers (`ltng:outApp`)
- Lightning Web Components for the UI
- Health Cloud objects (`Account` as Person Account, `HealthcareProvider`)
- Custom objects from UST ePlus managed package (`UST_EPLUS__Interaction__c`, `UST_EPLUS__Verification_Information__c`)

**Implementation decisions** (retry behavior, caller identity requirements, security posture, deployment strategy) are captured in the Decisions & Rationale section of [genesysCodeAnalysisSummary.md](genesysCodeAnalysisSummary.md). The remediation plan below reflects those decisions.

**Security posture:** The VF page controllers intentionally run in system mode (`without sharing`, no FLS checks). This is a call center "break glass" workflow — CSRs need unrestricted access to matched records and sensitive verification fields (SSN, DOB, TIN) to perform caller verification. Access to this workflow is controlled at the entry point: Genesys call center routing determines which calls trigger a screen pop, and Salesforce permission set assignments control which users can access the verification pages. The `without sharing` declaration is explicit and intentional, not an oversight.

---

## Known Issues Under Investigation

### 1. Failure to Log Caller Name and Verification Data (Code Bug)

The `UST_EPLUS__Verification_Information__c` record is not consistently capturing the caller name and other relevant fields. This is caused by bugs in the LWC verification modal components, analyzed in detail in the [Root Cause Analysis](#root-cause-analysis-verification-information-not-logging-caller-data) section below.

### 2. Screen Pop Failure in Sandbox (Configuration Issue - Not a Code Bug)

The screen pop fails to fire in the sandbox environment. This has been determined to be a **Genesys Cloud configuration issue** specific to how the Genesys integration interacts with the sandbox, not a defect in the Apex or LWC code. The screen pop works consistently in production. This issue is being troubleshot directly at the configuration level to enable live-call debugging in the sandbox. It is **out of scope** for code changes.

---

## Complete Asset Inventory

### Apex Classes (Custom - No Namespace)

| File | Type | Role | Status |
|---|---|---|---|
| `GenesysCTIExtensionClassV2.cls` | Screen Pop Handler | Parses Genesys payload, searches Account then HCP, redirects to VF page | **ACTIVE** |
| `GenesysCTIExtensionClass.cls` | Screen Pop Handler | Earlier version; Account search only (no HCP fallback) | Legacy |
| `MyScreenPopExtension7.cls` | Screen Pop Handler | Phone-only search, multi-record support | Legacy |
| `MyScreenPopExtension6.cls` | Screen Pop Handler | Phone-only search, multi-Account, single HCP | Legacy |
| `MyScreenPopExtension5.cls` | Screen Pop Handler | Phone-only search, LIMIT 1 on both | Legacy |
| `GC_Account_PageController.cls` | VF Page Controller | Queries Account records by ID list, serializes to JSON | Active |
| `GC_HealthcareProvider_PageController.cls` | VF Page Controller | Queries HCP records by ID list, serializes to JSON | Active |
| `DelayedDeleteHandler.cls` | Queueable Job | Deletes duplicate HealthcareProvider records asynchronously | Active |
| `ExportToExcelControllerHCP.cls` | Apex Controller | Provides data for HCP Form export-to-Excel feature | Active (unrelated to call flow) |
| `TestGenesysCTIExtensionClassV2.cls` | Test Class | Tests for V2 CTI extension | Active |
| `TestMyScreenPopExtension5.cls` | Test Class | Tests for Extension 5 | Legacy |
| `TestMyScreenPopExtension6.cls` | Test Class | Tests for Extension 6 | Legacy |
| `TestMyScreenPopExtension7.cls` | Test Class | Tests for Extension 7 | Legacy |
| `Test_GC_Account_PageController.cls` | Test Class | Tests for Account page controller | Active |
| `Test_GC_HCPPageController.cls` | Test Class | Tests for HCP page controller | Active |
| `TestExportToExcelControllerHCP.cls` | Test Class | Tests for export controller | Active (unrelated) |
| `testHealthcareProviderTrigger.cls` | Test Class | Tests for HCP trigger | Active |
| `SandboxRefreshScript.cls` | Utility | Post-sandbox-copy operations | Utility |
| `SandboxPostCopyMock.cls` | Utility | Mock for sandbox copy testing | Utility |
| `TestSandboxRefreshScript.cls` | Test Class | Tests for sandbox refresh | Utility |

### Visualforce Pages

| File | Controller | Purpose |
|---|---|---|
| `VerifyMemberVisualforcePage.page` | `GC_Account_PageController` | Hosts `c:verifyMember` LWC via Lightning Out |
| `VerifyHealthcareProviderVisualforcePage.page` | `GC_HealthcareProvider_PageController` | Hosts `c:verifyProvider` LWC via Lightning Out |

### Aura Applications

| Bundle | Purpose |
|---|---|
| `MyLWCApp` | `ltng:outApp` wrapper declaring dependency on `c:verifyMember` |
| `MyProviderLWCApp` | `ltng:outApp` wrapper declaring dependency on `c:verifyProvider` |

### Lightning Web Components

| Bundle | Purpose |
|---|---|
| `verifyMember` | Displays matched Account table, creates Interaction record, opens member verification modal |
| `verifyProvider` | Displays matched HCP table, creates Interaction record, opens provider verification modal |
| `memberVerificationModal` | Member identity verification UI; creates Verification Information record |
| `providerVerificationModal` | Provider identity verification UI; creates Verification Information record |
| `e2e_HCP_Main` | Export-to-Excel for Healthcare Provider Forms (unrelated to call flow) |

### Triggers

| Trigger | Object | Event | Purpose |
|---|---|---|---|
| `HealthcareProviderTrigger` | `HealthcareProvider` | After Insert | Deduplication: promotes Prospective Providers to Supplier Location when a matching NPI arrives |

---

## Execution Flow Diagram

```
GENESYS CLOUD DELIVERS INBOUND CALL
              |
              v
+=============================================+
|  GenesysCTIExtensionClassV2.onScreenPop()   |   <-- purecloud.CTIExtension.ScreenPop
|                                             |
|  STEP 1: Parse JSON payload                 |
|    jsonData -> deserializedData (Map)        |
|    -> interaction -> attributes              |
|       -> sf_searchvalue (nested JSON string) |
|    -> searchValue (ANI / caller phone)       |
|                                             |
|  STEP 2: Extract variables                  |
|    - sf_last4SSN (from sf_searchvalue JSON)  |
|    - sf_ANI (from sf_searchvalue JSON)       |
|    - sf_RecordId (from sf_searchvalue JSON)  |
|    - sf_NPI (from sf_searchvalue JSON)       |
|    - searchValue (strip +1 country code)     |
|                                             |
|  STEP 3: MEMBER SEARCH (Account)            |
|    Priority 1: Phone + Last4SSN match       |
|    Priority 2: Last4SSN only match          |
|    Priority 3: Phone only match             |
|    -> orderedAccountIds (combined list)      |
|                                             |
|  STEP 4: If Accounts found                  |
|    -> Return URL to VerifyMemberVFPage       |
|       with ?ids=[serialized ID list]         |
|    -> EXIT (never reaches provider search)   |
|                                             |
|  STEP 5: PROVIDER SEARCH (HealthcareProvider)|
|    (Only if NO Accounts were found)          |
|    RecordType = 'Supplier Location'          |
|    Priority 1: Phone + NPI match            |
|    Priority 2: NPI only match               |
|    Priority 3: Phone only match             |
|    -> orderedHCPIds (combined list)          |
|                                             |
|  STEP 6: If HCPs found                      |
|    -> Return URL to VerifyHCPVFPage          |
|       with ?ids=[serialized ID list]         |
|                                             |
|  STEP 7: If nothing found                   |
|    -> Return {defaultScreenPop: true}        |
+=============================================+
              |
      +-------+--------+
      |                 |
      v                 v
MEMBER PATH        PROVIDER PATH
      |                 |
      v                 v
+------------------+  +------------------------------+
| GC_Account_      |  | GC_HealthcareProvider_        |
| PageController   |  | PageController                |
|                  |  |                                |
| - Read ?ids=     |  | - Read ?ids=                   |
|   param          |  |   param                        |
| - Deserialize    |  | - Deserialize                  |
|   ID list        |  |   ID list                      |
| - Query Accounts |  | - Query HealthcareProviders    |
|   by ID (ordered)|  |   by ID (ordered)              |
| - Serialize to   |  | - Serialize to                 |
|   JSON           |  |   JSON                         |
+--------+---------+  +---------------+----------------+
         |                            |
         v                            v
+------------------+  +------------------------------+
| VerifyMember     |  | VerifyHealthcareProvider      |
| VF Page          |  | VF Page                       |
|                  |  |                                |
| - $Lightning.use |  | - $Lightning.use               |
|   (MyLWCApp)     |  |   (MyProviderLWCApp)           |
| - Parse JSON     |  | - Parse JSON                   |
| - Create LWC     |  | - Create LWC                   |
|   c:verifyMember |  |   c:verifyProvider             |
+--------+---------+  +---------------+----------------+
         |                            |
         v                            v
+------------------+  +------------------------------+
| verifyMember LWC |  | verifyProvider LWC            |
|                  |  |                                |
| - Display table  |  | - Display table                |
|   of Accounts    |  |   of Providers                 |
| - "Verify Member"|  | - "Verify Provider"            |
|   button per row |  |   button per row               |
+--------+---------+  +---------------+----------------+
         |                            |
    CSR Clicks                   CSR Clicks
   "Verify Member"             "Verify Provider"
         |                            |
         v                            v
+------------------+  +------------------------------+
| CREATE           |  | CREATE                        |
| UST_EPLUS__      |  | UST_EPLUS__                   |
| Interaction__c   |  | Interaction__c                |
| (empty record)   |  | (empty record)                |
+--------+---------+  +---------------+----------------+
         |                            |
         v                            v
+------------------+  +------------------------------+
| memberVerif.     |  | providerVerif.                |
| Modal LWC        |  | Modal LWC                     |
|                  |  |                                |
| 1. Case Origin   |  | 1. Case Origin dropdown       |
|    dropdown      |  | 2. Verification checkboxes    |
| 2. Member Type   |  |    (2 required)               |
|    dropdown      |  | 3. "Calling on behalf?"       |
| 3. Verification  |  |    -> Caller Name/Phone/Type  |
|    checkboxes    |  |                                |
|    (3 required)  |  |                                |
| 4. Non-Member?   |  |                                |
|    -> Rep Type   |  |                                |
|    -> Relationship|  |                               |
|    -> Caller info|  |                                |
+--------+---------+  +---------------+----------------+
         |                            |
    CSR Clicks                   CSR Clicks
     "Verify"                     "Verify"
         |                            |
         v                            v
+------------------+  +------------------------------+
| 1. Dispatch      |  | 1. Dispatch                   |
|    'close' event |  |    'close' event              |
|    (MODAL CLOSES)|  |    (MODAL CLOSES)             |
|                  |  |                                |
| 2. CREATE        |  | 2. CREATE                     |
|    Verification  |  |    Verification               |
|    Information   |  |    Information                 |
|    record        |  |    record                     |
|                  |  |                                |
| 3. Navigate to   |  | 3. Navigate to                |
|    Account page  |  |    HCP page                   |
+------------------+  +------------------------------+
```

---

## File-by-File Analysis

---

### GenesysCTIExtensionClassV2.cls (ACTIVE)

**Path:** `force-app/main/default/classes/GenesysCTIExtensionClassV2.cls`
**Lines:** 179

**What It Does:**
This is the primary entry point for the entire call handling system. It implements the `purecloud.CTIExtension.ScreenPop` interface, which means Genesys Cloud calls `onScreenPop(String jsonData)` every time a call interaction occurs (inbound, outbound, transfer, etc.). The method receives a JSON payload from Genesys containing call metadata, parses it, searches for matching records, and returns a JSON response telling the Genesys client where to navigate.

**How It Works (Step by Step):**

1. **JSON Parsing (lines 11-45):** Deserializes the raw JSON string into a nested map structure. Extracts the `interaction.attributes.sf_searchvalue` field, which is itself a JSON string containing IVR-collected data. Parses that nested JSON to extract `Last4SSN`, `ANI`, `RecordID`, and `NPI`. The code uses `containsKey()` checks before accessing map values, providing protection against missing keys (though not against malformed JSON).

2. **Phone Normalization (lines 48-55):** Extracts the `searchValue` (ANI/phone number) from the top-level payload and strips the `+1` country code prefix if present.

3. **Member Search (lines 60-98):** Runs up to 3 SOQL queries against the `Account` object in priority order:
   - Both phone AND Last4SSN match
   - Last4SSN only (excluding already-matched IDs)
   - Phone only (excluding already-matched IDs)

   Combines results into a single ordered list with best matches first.

4. **Member Redirect (lines 104-111):** If any Accounts were found, serializes the ID list, constructs a URL to `VerifyMemberVisualforcePage`, and returns it. **The method returns here and never reaches the provider search.**

5. **Provider Search (lines 114-158):** Only executes if zero Accounts were found. Queries `HealthcareProvider` filtered to RecordType "Supplier Location", using the same 3-tier priority system but matching on `UST_EPLUS__Provider_NPI__c` instead of Last4SSN.

6. **Provider Redirect or Default (lines 164-177):** If HCPs were found, redirects to `VerifyHealthcareProviderVisualforcePage`. Otherwise, returns `{defaultScreenPop: true}` which tells Genesys to use its built-in screen pop behavior.

**Best Practices Assessment:**

| Issue | Severity | Detail |
|---|---|---|
| **No try-catch block** | **HIGH** | The entire `onScreenPop` method has zero exception handling. Any parsing error, malformed JSON, null reference, or SOQL exception will cause an unhandled exception. While the screen pop works in production, any future data anomaly (e.g., unexpected JSON format from a Genesys update, a missing RecordType after a metadata change) would cause a silent failure with no logging and no fallback for the CSR. |
| **Unprotected RecordType query** | **HIGH** | Line 117: `RecordType rt = [SELECT Id FROM RecordType WHERE ... LIMIT 1]` assigns the SOQL result directly to a single `RecordType` variable. If the "Supplier Location" RecordType doesn't exist, is renamed, or is deactivated, this throws `System.QueryException` ("List has no rows for assignment to SObject"). Should use a list-based query with an `isEmpty()` check. |
| **No phone number normalization beyond +1** | **MEDIUM** | Lines 52-55 only strip the `+1` prefix. No other format normalization is applied. If Genesys sends digits-only (e.g., `3035551234`) and the Account.Phone field stores formatted values (e.g., `(303) 555-1234`), the exact-match `WHERE Phone = :searchValue` will fail. However, since the screen pop works consistently in production, the current phone formats between Genesys and Salesforce appear to be compatible in the production environment. |
| **Account search blocks Provider search** | **MEDIUM** | If ANY Account matches the phone number (even a wrong one), the provider search never runs (line 104). A provider calling from a phone number that also exists on any Account record will be routed to the member verification path. |
| **No SOQL result limits** | **MEDIUM** | The Account and HCP queries (lines 68, 78, 88, 128, 138, 148) have no `LIMIT` clause. If a common phone number matches many records, the serialized ID list in the URL could become very long. |
| **Class-level instance variables unused downstream** | **LOW** | `sf_ANI` (line 4) and `sf_RecordId` (line 5) are extracted from the JSON payload (lines 37, 40) but never referenced in any query or logic. They serve no purpose in the current code. `sf_last4SSN` and `sf_NPI` are used. |
| **Mutable list reference** | **LOW** | Line 96: `List<String> orderedAccountIds = bothMatches;` assigns the reference, not a copy. Subsequent `addAll()` calls modify the original `bothMatches` list. This works as intended but is unclear. Same pattern on line 156. |

---

### GenesysCTIExtensionClass.cls (Legacy V1)

**Path:** `force-app/main/default/classes/GenesysCTIExtensionClass.cls`
**Lines:** 106

**What It Does:**
The first version of the CTI extension with enhanced data parsing. It performs the same `sf_searchvalue` JSON parsing as V2 but only searches for Account records. If no Account is found, it returns `defaultScreenPop`. It does NOT search for HealthcareProvider records.

**How It Differs from V2:**
- No `sf_NPI` extraction
- No HealthcareProvider search
- No class-level instance variables (all local)
- Same JSON parsing chain

**Best Practices Assessment:**
Same best practices issues as V2 (no try-catch, no phone normalization beyond +1). This is inactive dead code that should be removed from the org once confirmed inactive to reduce maintenance burden and avoid confusion about which class is active.

---

### MyScreenPopExtension7.cls (Legacy)

**Path:** `force-app/main/default/classes/MyScreenPopExtension7.cls`
**Lines:** 74

**What It Does:**
An earlier iteration that searches by phone number only (no SSN, no NPI, no `sf_searchvalue` parsing). Searches Account first, falls through to HealthcareProvider. Supports multiple records for both paths.

**Best Practices Assessment:**
- Same no-try-catch issue
- Same unprotected RecordType query (line 42)
- No `sf_searchvalue` parsing means it only uses the ANI

---

### MyScreenPopExtension6.cls (Legacy)

**Path:** `force-app/main/default/classes/MyScreenPopExtension6.cls`
**Lines:** 69

**What It Does:**
Similar to Extension 7 but uses `LIMIT 1` on the HCP query and passes a single HCP ID in the URL (`?id=` instead of `?ids=`). This means only the first matching HealthcareProvider would be shown.

**Best Practices Assessment:**
- Same issues as Extension 7
- VF page URL uses `?id=` (singular) for HCP, creating an inconsistent API with the current system which expects `?ids=` (plural with JSON array). If this class were accidentally activated, the HCP VF page controller would fail because it reads `ids`, not `id`.

---

### MyScreenPopExtension5.cls (Legacy)

**Path:** `force-app/main/default/classes/MyScreenPopExtension5.cls`
**Lines:** 66

**What It Does:**
The earliest iteration. Uses `LIMIT 1` on both Account and HCP queries. Passes a single record ID via `?id=`. This would only work with a version of the VF page that reads a single `id` parameter.

**Best Practices Assessment:**
- Same core issues
- Oldest version; furthest from current architecture
- Uses `?id=` parameter format incompatible with current VF page controllers

---

### GC_Account_PageController.cls

**Path:** `force-app/main/default/classes/GC_Account_PageController.cls`
**Lines:** 48

**What It Does:**
Visualforce page controller for `VerifyMemberVisualforcePage`. In its constructor:
1. Reads the `ids` URL parameter (line 7)
2. Deserializes it from JSON into a `List<Id>` (line 10)
3. Queries Account records with all fields needed for the verification display (lines 15-25)
4. Preserves the original order by iterating the ordered ID list against a Map (lines 29-33)
5. Handles null results gracefully by initializing to an empty list (lines 40-42)
6. Serializes the results back to JSON for the Visualforce page (line 45)

**Fields Queried:** Id, Name, Phone, UST_EPLUS__Member_ID__c, UST_EPLUS__SSN_Masked__c, PersonBirthdate, HealthCloudGA__BirthDate__pc, UST_EPLUS__PersonBirthDate__c, PersonMailingStreet, PersonMailingCity, PersonMailingState, PersonMailingPostalCode, PersonMailingCountry, Last_4_SSN_V2__c

**Best Practices Assessment:**

| Issue | Severity | Detail |
|---|---|---|
| **No exception handling** | **HIGH** | If `ids` param contains invalid JSON or non-ID values, `JSON.deserialize` (line 10) will throw an exception and the page will show a Salesforce error page. |
| **Implicit sharing mode** | **MEDIUM** | Uses `public class` without an explicit sharing keyword. System mode is intentional for this call center workflow (CSRs need to see all matched records regardless of ownership), but should be declared explicitly as `without sharing` to document the decision. FLS enforcement is not required here — all CSRs in this workflow need SSN/DOB fields to perform verification; access is controlled at the workflow entry point. |
| **Constructor logic** | **MEDIUM** | SOQL is performed in the constructor (line 15). Salesforce best practice recommends keeping constructor logic minimal and using action methods or lazy-loading. |

---

### GC_HealthcareProvider_PageController.cls

**Path:** `force-app/main/default/classes/GC_HealthcareProvider_PageController.cls`
**Lines:** 52

**What It Does:**
Identical pattern to `GC_Account_PageController` but for `HealthcareProvider` records. Queries provider-specific fields: Id, Name, UST_EPLUS__Provider_ID__c, UST_EPLUS__Provider_Tax_ID__c, UST_EPLUS__Provider_NPI__c, UST_EPLUS__Provider_Status__c, UST_EPLUS__Practice_Street_Address__c, UST_EPLUS__Practice_City__c, UST_EPLUS__Practice_State__c, UST_EPLUS__Practice_ZIP_Code__c, UST_EPLUS__Primary_Phone_Number__c.

**Best Practices Assessment:**
Same issues as `GC_Account_PageController`. Implicit sharing mode (should be explicitly declared as `without sharing`), no exception handling, constructor-based SOQL.

---

### VerifyMemberVisualforcePage.page

**Path:** `force-app/main/default/pages/VerifyMemberVisualforcePage.page`
**Lines:** 44

**What It Does:**
A Visualforce page that serves as a bridge between the Apex screen pop redirect and the LWC component. It:
1. Uses `<apex:includeLightning/>` to enable Lightning Out
2. Calls `$Lightning.use("c:MyLWCApp", ...)` to load the Aura app (line 9)
3. Parses `{!fetchedRecordsJson}` (a merge field from the controller) via `JSON.parse()` (line 13)
4. Maps each Account record into a simplified JavaScript object with renamed properties (lines 16-31)
5. Creates the `c:verifyMember` LWC component and injects the records as the `accounts` attribute (lines 34-41)

**Best Practices Assessment:**

| Issue | Severity | Detail |
|---|---|---|
| **Merge field in JSON.parse without JSENCODE** | **MEDIUM** | Line 13: `JSON.parse('{!fetchedRecordsJson}')` embeds the Apex-serialized JSON directly into JavaScript via a merge field. If the JSON contains single quotes, backslashes, or other JavaScript-special characters, this could break the JavaScript. Should use `{!JSENCODE(fetchedRecordsJson)}` for safety. |
| **Lightning Out is a legacy pattern** | **MEDIUM** | Using VF pages with `$Lightning.use` to host LWC components is the older migration pattern. However, this pattern is necessary here because the screen pop redirect mechanism in the Genesys managed package returns a URL, and VF pages have addressable URLs while LWC components do not. |

---

### VerifyHealthcareProviderVisualforcePage.page

**Path:** `force-app/main/default/pages/VerifyHealthcareProviderVisualforcePage.page`
**Lines:** 46

**What It Does:**
Same pattern as `VerifyMemberVisualforcePage` but creates `c:verifyProvider` via `c:MyProviderLWCApp`. Maps HCP fields (Name, ProviderId, ProviderTIN, NPI, Status, address fields, Phone) on lines 19-32.

**Best Practices Assessment:**
Same issues as the member VF page. Same `JSON.parse('{!fetchedRecordsJson}')` pattern without `JSENCODE`.

---

### MyLWCApp (Aura)

**Path:** `force-app/main/default/aura/MyLWCApp/MyLWCApp.app`
**Lines:** 3

**What It Does:**
A minimal Aura application that extends `ltng:outApp` and declares a dependency on `c:verifyMember`. This is required by the Lightning Out pattern - you need an Aura app to host an LWC in a Visualforce page.

**Best Practices Assessment:**
This is the correct and minimal pattern for Lightning Out. No issues.

---

### MyProviderLWCApp (Aura)

**Path:** `force-app/main/default/aura/MyProviderLWCApp/MyProviderLWCApp.app`
**Lines:** 3

**What It Does:**
Same as `MyLWCApp` but declares dependency on `c:verifyProvider`.

**Best Practices Assessment:**
Correct pattern. No issues.

---

### verifyMember (LWC)

**Path:** `force-app/main/default/lwc/verifyMember/`
**Files:** `verifyMember.js` (156 lines), `verifyMember.html` (69 lines), `verifyMember.css` (40 lines)

**What It Does:**
Displays a table of matched Account records showing Name, Phone, Last 4 SSN, Member ID, Date of Birth, and Mailing Address. Each row has a "Verify Member" button. When clicked:

1. `handleMemberClick()` (line 83) extracts the Account ID from the button's `data-id` attribute
2. `createInteractionRecord()` (line 94) creates a new `UST_EPLUS__Interaction__c` record **with no field values** — `const fields = {};` on line 95
3. On success, stores the returned `interaction.id` and `interaction.fields.Name.value` (lines 101-102)
4. Calls `openModal(accountId)` (line 105) which sets `isModalOpen = true` and displays the `memberVerificationModal`

**Data Passing to Modal:**
The modal receives data **declaratively** through template attributes in `verifyMember.html` (lines 54-58):
```html
<c-member-verification-modal
    account={selectedAccount}
    interaction-id={interactionRecordId}
    interaction-name={interactionName}
    onclose={handleModalClose}>
</c-member-verification-modal>
```
`selectedAccount` is a properly defined getter (line 113: `get selectedAccount()`) that finds the matching account by `recordId`. This declarative approach is reliable.

**Best Practices Assessment:**

| Issue | Severity | Detail |
|---|---|---|
| **Empty Interaction record creation** | **HIGH** | Lines 95-97: `const fields = {};` followed by `createRecord(recordInput)` creates an Interaction record with no fields populated. The record has no Account reference, no phone number, no call metadata. It relies entirely on auto-number Name and any default field values. |
| **`@track` on primitives** | **LOW** | `@track` on primitive types (`isModalOpen`, `selectedAccountId`, etc.) is unnecessary since LWC automatically tracks reactive primitive properties. `@track` is only needed for deep object/array mutation tracking. This is cosmetic, not functional. |
| **`window.location.href` for navigation** | **LOW** | Line 150: Using `window.location.href` causes a full page reload. Salesforce best practice recommends `NavigationMixin`, but since this runs inside a VF page (Lightning Out), `NavigationMixin` may not work correctly. `window.location.href` is a pragmatic choice in this context. |

---

### verifyProvider (LWC)

**Path:** `force-app/main/default/lwc/verifyProvider/`
**Files:** `verifyProvider.js` (106 lines), `verifyProvider.html` (68 lines), `verifyProvider.css` (40 lines)

**What It Does:**
Same pattern as `verifyMember` but for HealthcareProvider records. Displays Provider Name, ID, TIN, NPI, Status, Address, and Phone. Creates an Interaction record, then opens `providerVerificationModal`.

**Critical Difference from verifyMember — Imperative Data Passing:**

The `openModal()` method (lines 58-75) uses `setTimeout(() => {...}, 0)` to pass data imperatively to the modal after render:

```javascript
// verifyProvider.js lines 66-74
setTimeout(() => {
    const modal = this.template.querySelector('c-provider-verification-modal');
    if (modal) {
        modal.interactionId = this.interactionRecordId;
        modal.interactionName = this.interactionName;
        modal.providerId = this.selectedProviderId;
        modal.healthcareProvider = this.selectedProvider();
    }
}, 0);
```

This is in contrast to `verifyMember`, which passes all data declaratively through template attributes. The provider modal template (`verifyProvider.html` lines 55-58) only passes `healthcare-provider` and `onclose`:

```html
<c-provider-verification-modal
    healthcare-provider={selectedProvider}
    onclose={handleModalClose}>
</c-provider-verification-modal>
```

Additionally, `selectedProvider` is defined as a **method** (line 84: `selectedProvider()`) rather than a **getter** (`get selectedProvider()`). In LWC templates, `{selectedProvider}` looks for a getter or property, not a method. It will not invoke the method, so the template binding `healthcare-provider={selectedProvider}` passes `undefined` to the child component. The `setTimeout` workaround exists to compensate for this, setting all four properties imperatively after the modal renders.

**Best Practices Assessment:**

| Issue | Severity | Detail |
|---|---|---|
| **Empty Interaction record** | **HIGH** | Same issue as `verifyMember`. Line 42-43: `const fields = {};` — no fields populated on the Interaction record. |
| **setTimeout for data passing** | **HIGH** | Lines 66-74: Using `setTimeout(fn, 0)` to pass data to a child component is fragile. The child component may not be rendered yet when the timeout fires, `querySelector` may return null, and there's no guarantee of execution order. The correct pattern is to pass data declaratively via template attributes (as `verifyMember` does). **This is a contributor to the verification data logging failure for providers — if `interactionId` or `providerId` are not set before the CSR clicks Verify, the Verification Information record will be created with null values.** |
| **`selectedProvider()` is a method, not a getter** | **HIGH** | Line 84: `selectedProvider()` is defined as a regular method. In the template (line 56 of the HTML), it's referenced as `{selectedProvider}` which in LWC looks for a property or getter, not a method. The template binding `healthcare-provider={selectedProvider}` will be `undefined`. The `setTimeout` workaround exists to compensate, but the correct fix is to change the method to a getter: `get selectedProvider()`. |
| **Inconsistent data passing pattern** | **MEDIUM** | `verifyMember` passes data to its modal declaratively in the template. `verifyProvider` passes data imperatively via `setTimeout` + `querySelector`. These should use the same pattern. |

---

### memberVerificationModal (LWC)

**Path:** `force-app/main/default/lwc/memberVerificationModal/`
**Files:** `memberVerificationModal.js` (264 lines), `memberVerificationModal.html` (142 lines), `memberVerificationModal.css` (55 lines)

**What It Does:**
This is the core member verification workflow. It:

1. **Phase 1 — Classification:** Shows two dropdowns:
   - **Case Origin** (Inbound Phone, Outbound Phone, Chat, Walk-In, etc.)
   - **Member Type** (Member or Non-Member)

   Both must be selected before proceeding — `checkSelectionsAndDisplayVerification()` (line 172) requires both `caseOriginValue` AND `memberTypeValue` to be truthy before transitioning to the verification section.

2. **Phase 2 — Verification Checkboxes:** Displays checkboxes alongside member data for the CSR to confirm identity:
   - Member ID, SSN, Member Name*, Date of Birth*, Phone Number, Mailing Address*
   - Items marked with * show a red asterisk if data is present (lines 108-109)
   - Checkboxes are disabled if the corresponding data field is null/empty (line 107)

3. **Phase 3 — Non-Member Details (conditional):** If "Non-Member" was selected:
   - Representative Type dropdown appears (Legal Representative, Personal Representative)
   - If Personal Representative: Relationship Type dropdown (Parent, Guardian, County DHS, POA, etc.)
   - When a Representative Type is selected, additional fields appear: Name, Caller Phone, Description

4. **Verify Action (lines 187-221):** When the CSR clicks "Verify":
   - Requires at least 3 checked verification items (line 196)
   - Builds a `verificationData` object with interactionId, callerName, accountId, caseOrigin, representativeType, callerPhone (lines 197-204)
   - Dispatches a `close` CustomEvent to the parent (lines 208-211)
   - Calls `createVerificationRecord()` which creates a `UST_EPLUS__Verification_Information__c` record (line 213)
   - Navigates to the Account record page (line 252 or 256)

**Verification_Information__c Fields Populated:**
- `UST_EPLUS__CSR_Interaction__c` = interactionId (line 241)
- `UST_EPLUS__Caller_Name__c` = callerName / nameValue (line 242)
- `UST_EPLUS__Member__c` = accountId (line 243)
- `UST_EPLUS__Case_Origin__c` = caseOriginValue (line 244)
- `UST_EPLUS__CallerRelationshiptoMember__c` = representativeTypeValue (line 245)
- `UST_EPLUS__CallerPhoneNumber__c` = callerPhoneValue (line 246)

**Best Practices Assessment:**

| Issue | Severity | Detail |
|---|---|---|
| **Close event fires BEFORE record creation** | **CRITICAL** | Lines 208-213: The `close` CustomEvent is dispatched BEFORE `createVerificationRecord()` is called. When the parent (`verifyMember`) receives this event, it sets `isModalOpen = false` (line 67 of `verifyMember.js`), which removes the modal from the DOM. Custom events in LWC are synchronous — the parent's handler runs immediately, mutating `isModalOpen` before `createVerificationRecord` is called on line 213. The `createRecord` API call is likely initiated before the rendering cycle removes the component, but the component is unmounted before the async save completes/settles, making the Promise resolution handlers (`.then`/`.catch`) unreliable on a destroyed component. This makes save and navigation intermittently fail. **This is a root cause of the verification information logging failure.** |
| **Caller Name only captured for Non-Members** | **CRITICAL** | The Name input field (mapped to `callerName` in verification data via `this.nameValue`) is only visible when `showAdditionalFields` is true (line 94 of the HTML). `showAdditionalFields` only becomes true in `handleRepresentativeTypeChange()` (line 152 of the JS), which requires: (a) Member Type = "Non-Member", AND (b) a Representative Type is selected. For the most common scenario (Member Type = "Member"), there is **no caller name input field anywhere on the form**. `nameValue` stays as empty string `''`, so `UST_EPLUS__Caller_Name__c` is always blank for member calls. **This is a root cause of the caller name not being logged.** |
| **Caller Phone only captured for Non-Members** | **CRITICAL** | Same issue as caller name. The `callerPhoneValue` input (line 102-106 of the HTML) is inside the same `showAdditionalFields` block. For "Member" calls, caller phone is never captured. |
| **Navigation happens regardless of record creation success** | **MEDIUM** | Lines 252-257: `navigateToAccountPage` is called in both the `.then()` and `.catch()` blocks of `createRecord`. If the save fails, the CSR is navigated away with no indication that the record wasn't saved. |
| **`alert()` for validation feedback** | **MEDIUM** | Line 215: Uses browser `alert()` for the "member could not be verified" message. This is not accessible, doesn't follow SLDS patterns, and can be blocked by browser settings. |
| **Date of Birth display may be blank in modal** | **LOW** | The `formattedDateOfBirth` getter (lines 117-131) uses a regex matching `"Month Day, Year"` format (e.g., "January 15, 2000"). However, Salesforce Date fields serialized via `JSON.serialize()` produce ISO format ("2000-01-15"), which does not match this regex. The getter returns empty string, causing the DOB line in the modal to display as "DOB: " with no value. The table display in the parent `verifyMember` uses a different formatter based on `new Date()` which correctly handles ISO dates. This is a display inconsistency — the DOB data is still present for the verification checkbox to enable correctly. |
| **Recursive component reference in template** | **LOW** | Lines 126-141 of the HTML contain a `<template if:true={isModalOpen}>` block that renders a nested `<c-member-verification-modal>` inside itself. The `isModalOpen` property is not declared in `memberVerificationModal.js` (it exists in the parent `verifyMember.js`), so accessing it in this component returns `undefined` (falsy). This block never renders. It is dead code that should be removed. |

---

### providerVerificationModal (LWC)

**Path:** `force-app/main/default/lwc/providerVerificationModal/`
**Files:** `providerVerificationModal.js` (177 lines), `providerVerificationModal.html` (107 lines), `providerVerificationModal.css` (46 lines)

**What It Does:**
Provider verification workflow. Simpler structure than the member modal:

1. **Case Origin Dropdown** (always visible, lines 11-18 of the HTML) — not gated by any conditional, but also not required before verification
2. **Verification Checkboxes:** NPI*, Provider Name, Phone, Provider ID, TIN, Status, Provider Address*
   - Requires 2 checked items (line 128, vs. 3 for members)
3. **"Calling on behalf of Provider?" Checkbox** (line 66-69 of the HTML) — if checked, shows:
   - Caller Name, Caller Type (Billing Office, Provider/Clinical Office, etc.), Phone Number, Phone Extension

4. **Verify Action (lines 121-147):** Same pattern as member modal — dispatches close, creates Verification_Information__c, navigates to HCP page.

**Verification_Information__c Fields Populated:**
- `UST_EPLUS__CSR_Interaction__c` = interactionId (line 151)
- `UST_EPLUS__Caller_Name__c` = callerName (line 152)
- `UST_EPLUS__Healthcare_Provider__c` = providerId (line 153)
- `UST_EPLUS__Case_Origin__c` = caseOriginValue (line 154)
- `UST_EPLUS__CallerPhoneNumber__c` = callerPhoneNumber (line 155)

**Best Practices Assessment:**

| Issue | Severity | Detail |
|---|---|---|
| **Close event fires BEFORE record creation** | **CRITICAL** | Same issue as the member modal. Lines 138-143: `dispatchEvent(closeEvent)` fires before `createVerificationRecord()`. The parent unmounts the modal component before the async save completes/settles, making save and navigation intermittently unreliable. **This is a root cause of the verification information logging failure.** |
| **Caller Name only captured when "Calling on behalf" is checked** | **CRITICAL** | The `callerName` input field (line 78 of the HTML) only appears when `isCallingOnBehalf` is true (line 73). If the CSR does not check the "Are you calling on behalf of a Provider?" checkbox, `callerName` stays as empty string. For direct provider calls, the caller's name is never captured. **This is a root cause of the caller name logging failure.** |
| **Caller Phone only captured when "Calling on behalf" is checked** | **CRITICAL** | Same issue. The `callerPhoneNumber` input (line 88 of the HTML) is inside the same `isCallingOnBehalf` conditional block. For direct provider calls, caller phone is never captured. |
| **`handleInputChange` property name mismatch for Caller Type** | **HIGH** | Lines 116-119: `handleInputChange(event)` uses `this[name] = value` where `name` comes from `event.target.name`. The Caller Type combobox in the HTML (lines 81-85) has `name="callerType"`, but the tracked property is `callerTypeValue` (line 20). So `this["callerType"] = value` sets a non-existent, non-reactive property instead of `this.callerTypeValue`. The callerType combobox display won't reactively update. Additionally, `callerTypeValue` is never included in the `verificationData` object (lines 129-135) and is not mapped to any Verification_Information__c field, so caller type is neither properly tracked NOR persisted. |
| **Case Origin not required before Verify** | **HIGH** | Unlike the member modal where both Case Origin and Member Type must be selected before the verification section appears, the provider modal has no such gate. The Case Origin dropdown is always visible but the CSR can click Verify without selecting one, resulting in an empty `caseOriginValue`. **Decision: Case Origin will be required on the provider path to match member modal behavior.** |
| **Navigation on error** | **MEDIUM** | Lines 163-165: On `createRecord` error, still navigates to the HCP page. CSR has no idea the verification record wasn't saved. |

---

### HealthcareProviderTrigger.trigger

**Path:** `force-app/main/default/triggers/HealthcareProviderTrigger.trigger`
**Lines:** 47

**What It Does:**
An after-insert trigger on the `HealthcareProvider` object that handles deduplication. When a new HealthcareProvider record with RecordType "Supplier Location" is inserted:
1. Collects NPI values from the new records (lines 10-14)
2. Searches for existing HealthcareProvider records with RecordType "Prospective Provider" that have matching NPIs (lines 19-24)
3. If found: promotes the existing "Prospective Provider" record to "Supplier Location" by updating its RecordType (lines 29-32)
4. Schedules the newly-inserted (duplicate) records for asynchronous deletion via `DelayedDeleteHandler` (lines 35-44)

**Purpose:** When a provider's data feed creates a new "Supplier Location" record, but a "Prospective Provider" record already exists for that NPI, this trigger keeps the existing record (preserving its relationships and history) and deletes the new duplicate.

**Best Practices Assessment:**

| Issue | Severity | Detail |
|---|---|---|
| **Hardcoded RecordType IDs** | **CRITICAL** | Lines 3-4: `String triggeringRecordTypeId = '0125f000000iIQTAA2';` and `String searchingRecordTypeId = '0125f000000zJzmAAE';` are hardcoded 18-character RecordType IDs from production. RecordType IDs differ between environments (sandbox, production, scratch orgs). **This trigger silently does nothing in any sandbox**, because the hardcoded IDs won't match the sandbox RecordType IDs. This is one of the most fundamental Salesforce anti-patterns. Should use `Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Supplier Location').getRecordTypeId()`. |
| **No trigger handler pattern** | **HIGH** | All logic is inline in the trigger body rather than delegated to a handler class. This violates the "one trigger per object" and "trigger handler" patterns, making the code difficult to test, extend, and maintain. |
| **No recursion guard** | **MEDIUM** | Updating the RecordType of existing HealthcareProvider records (line 32: `update matchingRecords;`) will fire any update triggers on HealthcareProvider. If update triggers exist or are added later, this could cause recursion. No static variable guard is present. |
| **DML in trigger context** | **MEDIUM** | Line 32: `update matchingRecords;` performs DML inside the trigger. While functional, it could contribute to governor limit issues in bulk scenarios. |
| **Unrelated to call flow** | **INFO** | This trigger handles provider data management, not the inbound call screen pop. It only fires on HealthcareProvider insert operations. |

---

### DelayedDeleteHandler.cls

**Path:** `force-app/main/default/classes/DelayedDeleteHandler.cls`
**Lines:** 16

**What It Does:**
A `Queueable` class that accepts a list of HealthcareProvider IDs and deletes them asynchronously. Used by `HealthcareProviderTrigger` to delete duplicate records outside the trigger context (avoiding "cannot delete records in an after-insert trigger" restrictions).

**Best Practices Assessment:**

| Issue | Severity | Detail |
|---|---|---|
| **Silent error swallowing** | **HIGH** | Lines 11-13: The catch block only does `System.debug` logging. In production, debug logs are not monitored unless actively collected. Failed deletions will go completely unnoticed, leaving orphan/duplicate records. Should log to a custom object, send a platform event, or use email notification. |
| **No sharing enforcement** | **LOW** | Class is `public` without `with sharing`. Since it's system-level cleanup, `without sharing` may be intentional, but should be explicit. |

---

### e2e_HCP_Main (LWC)

**Path:** `force-app/main/default/lwc/e2e_HCP_Main/`
**Files:** `e2e_HCP_Main.js` (~1028 lines), `e2e_HCP_Main.html` (13 lines)

**What It Does:**
**This is NOT part of the call handling flow.** It's a Healthcare Provider Form export-to-Excel utility. It reads a `Healthcare_Provider_Form__c` record and its related records (contacts, facilities, practitioners, owner individuals, owner corporations), then generates a multi-sheet Excel file using the SheetJS library.

**Best Practices Assessment:**
Not relevant to the call flow issues. The component follows acceptable patterns for its purpose.

---

### ExportToExcelControllerHCP.cls

**Path:** `force-app/main/default/classes/ExportToExcelControllerHCP.cls`
**Lines:** 156

**What It Does:**
Apex controller providing data queries for the `e2e_HCP_Main` LWC. Contains `@AuraEnabled(cacheable=true)` methods to query Healthcare Provider Form data and related records.

**Relevance:** Not part of the call flow.

---

## Root Cause Analysis: Verification Information Not Logging Caller Data

### Root Cause 1: Close Event Unmounts Modal Before Async Save Settles

In both `memberVerificationModal.verify()` and `providerVerificationModal.verify()`, the `close` CustomEvent is dispatched **BEFORE** `createVerificationRecord()` is called:

```javascript
// memberVerificationModal.js lines 208-213
const closeEvent = new CustomEvent('close', {
    detail: { verificationData }
});
this.dispatchEvent(closeEvent);          // <-- Parent unmounts modal
this.createVerificationRecord(verificationData);  // <-- Async save on unmounting component
```

When the parent receives the `close` event:
- `verifyMember.handleModalClose()` sets `isModalOpen = false` (line 67)
- The template `<template if:true={isModalOpen}>` removes the modal from the DOM
- The `memberVerificationModal` component instance is scheduled for destruction

LWC custom events are synchronous. When `dispatchEvent(closeEvent)` is called on line 211, the parent's `handleModalClose` handler runs immediately (synchronously), setting `isModalOpen = false`. Control then returns to the child's `verify()` method, and `createVerificationRecord(verificationData)` is called on line 213. The `createRecord()` API call is initiated (returning a Promise), but the LWC rendering cycle then processes the `isModalOpen = false` mutation and removes the component from the DOM.

The `createRecord` API call is likely initiated before the component is removed from the DOM — the network request itself is not cancelled. However, the component is unmounted before the async save completes/settles, making the Promise resolution handlers (`.then`/`.catch`) unreliable. The navigation logic inside `.then()` may not execute on a destroyed component. This makes the save and subsequent navigation intermittently fail, which is consistent with the observed behavior of verification records sometimes not being created.

**This same pattern exists in `providerVerificationModal.js` lines 138-143.**

### Root Cause 2: Caller Name Field Not Visible for Most Call Types

**Member Path:** The caller name input field (`nameValue` variable, mapped to `UST_EPLUS__Caller_Name__c`) is only rendered when `showAdditionalFields` is `true` (`memberVerificationModal.html` line 94). The chain of conditions required:

1. `showAdditionalFields` is set to `true` only in `handleRepresentativeTypeChange()` (line 152 of the JS)
2. `handleRepresentativeTypeChange` only fires when the Representative Type dropdown changes
3. The Representative Type dropdown is only visible when `showRepresentativeDetails` is `true` (line 70 of the HTML)
4. `showRepresentativeDetails` is set to `true` when `memberTypeValue === 'Non-Member'` (line 145)

**Result:** For the most common scenario (Member Type = "Member"), there is no caller name input field anywhere on the form. `nameValue` stays as empty string, and `Caller_Name__c` is always blank.

**The same applies to `callerPhoneValue`** — the Caller Phone input is in the same `showAdditionalFields` block (line 102-106 of the HTML).

**Provider Path:** The `callerName` input field is only rendered when `isCallingOnBehalf` is checked (`providerVerificationModal.html` line 73). For direct provider calls where the checkbox is unchecked, caller name is never captured. The same applies to `callerPhoneNumber` (line 88).

### Root Cause 3 (Provider-specific): Imperative Data Passing via setTimeout

In `verifyProvider.openModal()` (lines 66-74):
```javascript
setTimeout(() => {
    const modal = this.template.querySelector('c-provider-verification-modal');
    if (modal) {
        modal.interactionId = this.interactionRecordId;
        modal.interactionName = this.interactionName;
        modal.providerId = this.selectedProviderId;
        modal.healthcareProvider = this.selectedProvider();
    }
}, 0);
```

This `setTimeout` with `0` delay pushes the data assignment to the next microtask. Since `selectedProvider` is a method (not a getter), the template binding `healthcare-provider={selectedProvider}` passes `undefined`. The `setTimeout` is the only mechanism that delivers the `interactionId`, `interactionName`, `providerId`, and `healthcareProvider` data to the modal.

In practice, the `setTimeout` fires quickly and data is usually present before the CSR interacts with the modal. However, this is a fragile pattern:
- If `querySelector` returns `null` (component not yet rendered), all data remains `undefined`
- There is no error handling or retry
- The pattern differs from the declarative approach used successfully by `verifyMember`

### Secondary Causes:

4. **`callerTypeValue` is neither tracked nor persisted (provider modal)** — The `handleInputChange` method (line 116-119 of `providerVerificationModal.js`) uses `this[name] = value`, but the Caller Type combobox has `name="callerType"` while the tracked property is `callerTypeValue`. So `this.callerType` is set (non-reactive, non-tracked) instead of `this.callerTypeValue`. Additionally, `callerTypeValue` is not included in the `verificationData` object and is not mapped to any Verification_Information__c field. Caller type is collected in the UI but never saved.

5. **No validation before record creation** — Neither modal validates that required fields (`interactionId`, `accountId`/`providerId`) have values before calling `createRecord`. If the Interaction record creation failed in the parent, `interactionId` would be `null`, and the Verification Information record is created without a link to the Interaction.

6. **Error handling navigates away** — Both modals navigate to the record page even when `createRecord` fails (the `.catch()` block calls `navigateToAccountPage`/`navigateToProviderPage`). The CSR receives no feedback that the record wasn't saved.

---

## Salesforce Best Practices Violations Summary

### Critical (Active Bugs)

| # | Violation | Location | Impact |
|---|---|---|---|
| 1 | Close event unmounts modal before async save settles | `memberVerificationModal.js` lines 208-213, `providerVerificationModal.js` lines 138-143 | Verification records intermittently not created |
| 2 | Caller identity fields not visible for primary call types | `memberVerificationModal.html` line 94 (gated by `showAdditionalFields`), `providerVerificationModal.html` line 73 (gated by `isCallingOnBehalf`) | Caller name and phone never captured for most calls |
| 3 | Hardcoded RecordType IDs | `HealthcareProviderTrigger.trigger` lines 3-4 | Trigger silently fails in every sandbox and non-production environment |

### High

| # | Violation | Location | Impact |
|---|---|---|---|
| 4 | No exception handling in screen pop entry point | `GenesysCTIExtensionClassV2.cls` (entire `onScreenPop` method) | Any future exception crashes silently with no fallback |
| 5 | Unprotected RecordType SOQL assignment | `GenesysCTIExtensionClassV2.cls` line 117 | `QueryException` if RecordType is missing or renamed |
| 6 | Empty Interaction records | `verifyMember.js` line 95, `verifyProvider.js` line 42 | Interaction records have no call context |
| 7 | Imperative data passing via setTimeout | `verifyProvider.js` lines 66-74 | Fragile pattern; data may be undefined |
| 8 | `selectedProvider()` is a method, not a getter | `verifyProvider.js` line 84 | Template binding passes `undefined`; setTimeout compensates |
| 9 | No error feedback to user on save failure | `memberVerificationModal.js` lines 254-257, `providerVerificationModal.js` lines 163-166 | CSR navigated away unaware that save failed |
| 10 | Silent error swallowing | `DelayedDeleteHandler.cls` lines 11-13 | Failed deletions go unnoticed |
| 11 | Implicit sharing mode (not explicitly declared) | `GC_Account_PageController.cls` line 1, `GC_HealthcareProvider_PageController.cls` line 1 | System mode is intentional for call center break-glass workflow, but should be declared explicitly as `without sharing` |
| 12 | No exception handling in VF page controllers | `GC_Account_PageController.cls`, `GC_HealthcareProvider_PageController.cls` | Invalid URL parameters crash the verification page |
| 13 | `handleInputChange` property name mismatch | `providerVerificationModal.js` lines 116-119 | Caller Type value is set on wrong property; never saved |
| 14 | Case Origin not required for Provider verification | `providerVerificationModal.html` | CSR can verify without selecting Case Origin; inconsistent with member path |

### Medium

| # | Violation | Location | Impact |
|---|---|---|---|
| 15 | No trigger handler pattern | `HealthcareProviderTrigger.trigger` | Untestable inline logic, no recursion guard |
| 16 | Merge field without JSENCODE | Both VF pages, line 13 each | Potential XSS/parsing errors if data contains special characters |
| 17 | No phone number normalization beyond +1 | `GenesysCTIExtensionClassV2.cls` lines 52-55 | Format mismatch risk (currently working in production; deferred) |
| 18 | Constructor-heavy VF controllers | Both page controllers | SOQL on every page load, no lazy loading |
| 19 | No SOQL result limits | `GenesysCTIExtensionClassV2.cls` (6 queries) | Potential URL length or governor limit issues |
| 20 | `alert()` for user feedback | `memberVerificationModal.js` line 215 | Not accessible, not SLDS |

### Low

| # | Violation | Location | Impact |
|---|---|---|---|
| 21 | `@track` on primitives | All LWC JS files | Cosmetic, no functional impact |
| 22 | Unused class-level variables | `GenesysCTIExtensionClassV2.cls` lines 4-5 | `sf_ANI`, `sf_RecordId` never used |
| 23 | Dead legacy classes | `MyScreenPopExtension5/6/7.cls`, `GenesysCTIExtensionClass.cls` | Clutter, maintenance overhead |
| 24 | Inconsistent URL parameter format | Legacy vs. current classes | `?id=` vs `?ids=` incompatibility |
| 25 | Dead recursive modal template | `memberVerificationModal.html` lines 126-141 | Unreachable code; confusing |
| 26 | DOB display inconsistency in modal | `memberVerificationModal.js` lines 117-131 | Regex doesn't match ISO date format from Salesforce |
| 27 | `window.location.href` navigation | All LWCs | Full page reload, but pragmatic in Lightning Out context |
| 28 | ANI not passed to downstream components | `GenesysCTIExtensionClassV2.cls`, VF pages, LWCs | Caller phone number available at screen pop entry but not forwarded to verification modals |

---

## Related Flows

The following active flows are triggered after the verification process completes and the CSR lands on the Account or HealthcareProvider record page. They are screen flows launched by the CSR, not triggered by the code analyzed here:

### Member Flows
- `Verify_Update_Member_Info` - Update member demographic information
- `CheckPatientEligibility` - Auto-launched eligibility check
- `Member_Benefit_Inquiry` - Benefit questions
- `Member_Billing_Inquiry` - Billing questions
- `Member_FWA_Inquiry` - Fraud, Waste, and Abuse
- `Member_General_Inquiry` - General member questions
- `Member_ID_Card_Request` - ID card requests
- `Member_Online_Inquiry_Flow` - Online portal support
- `Member_Phone_Translation_Requests` - Translation services
- `Member_Plan_Material_Request` - Plan material requests
- `Member_Prospect_Inquiry` - Prospective member inquiries
- `Member_SDOH_Inquiry` - Social Determinants of Health
- `MemberTplInquery` - Third-party liability inquiry

### Provider Flows
- `ProviderInquiryFlow` - General provider inquiry
- `Provider_Authorization_Inquiry_Flow` - Authorization questions
- `Provider_FWA_Inquiry` - Fraud, Waste, and Abuse
- `Provider_General_Inquiry` - General provider questions
- `Provider_Online_Inquiry_Flow` - Online portal support
- `Provider_Redirect_Call` - Call redirection
- `Provider_Verify_Member_Info` - Provider verifying member info
- `ProviderPlanMaterialRequest` - Plan material requests
- `ProvidersMemberBenefitInquiry` - Provider asking about member benefits
- `ProviderTplInquiry` - Third-party liability
- `providerOutboundCommunicationInquiry` - Outbound call tracking
- `ClaimsInquiryProvider` - Claims questions

### Other Related Flows
- `PatientRegistration` - New patient/member registration
- `AddPatientMedication` - Add medication to patient record
- `Record_Trigger_HC_Practitioner_facility_Form_Before_Save` - Auto-launched on HCP form save
- `Record_Trigger_HC_Provider_Form_After_Save` - Auto-launched on provider form save
- `Record_Trigger_HC_Provider_Form_After_Save_populate_Contact_Fields` - Auto-launched, populates contact fields

---

## Remediation Plan

This plan is divided into three phases plus deferred items. Phase 1 resolves the reported code bugs (verification data not logging, caller identity not capturable, Case Origin gap, ANI auto-fill). Phase 2 fixes high-severity best practices violations to improve reliability and code quality. Phase 3 addresses medium and low-severity cleanup. The HealthcareProviderTrigger fix (Step 2.4) is deployed separately from the call-flow fixes. Two items are deferred pending further investigation (Interaction record population and phone normalization).

---

### Phase 1: Fix Verification Data Logging

---

#### Step 1.1 — Fix the save-before-close race condition in `memberVerificationModal.js`

**File:** `memberVerificationModal.js`
**Problem:** In the `verify()` method (lines 207-213), the `close` CustomEvent is dispatched before `createVerificationRecord()` is called. The parent `verifyMember` receives the event, sets `isModalOpen = false` (line 67 of `verifyMember.js`), and unmounts the modal from the DOM. The component is unmounted before the async save completes/settles, making the Promise resolution handlers unreliable. This causes intermittent verification record loss.

**Fix:** Create the record first, then dispatch close and navigate in the `.then()` callback. On failure, keep the modal open with an error message and allow retry. Replace the current `verify()` success block (lines 196-213):

```javascript
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

    // Dispatch event to parent with verification data
    const closeEvent = new CustomEvent('close', {
        detail: { verificationData }
    });
    this.dispatchEvent(closeEvent);

    this.createVerificationRecord(verificationData);
}
```

With:

```javascript
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
}
```

Add tracked properties:
```javascript
@track isSaving = false;
@track errorMessage = '';
```

Then update `createVerificationRecord()` (lines 239-257) to dispatch the close event and navigate only on success, and keep the modal open with retry on failure:

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
            // Modal stays open — CSR can retry by clicking Verify again
        });
}
```

Add an error display in the HTML above the Verify button:
```html
<template if:true={errorMessage}>
    <div class="slds-notify slds-notify_alert slds-alert_warning" role="alert">
        <span>{errorMessage}</span>
    </div>
</template>
```

This ensures the `createRecord` call completes before the component is unmounted. On save failure, the modal stays open and the CSR can retry — no navigation happens until the record is saved.

---

#### Step 1.2 — Fix the same save-before-close race condition in `providerVerificationModal.js`

**File:** `providerVerificationModal.js`
**Problem:** Identical to Step 1.1. Lines 138-143 dispatch the `close` event before `createVerificationRecord()` is called. The component is unmounted before the async save completes/settles.

**Fix:** Apply the same save-before-close pattern with retry on failure. In `verify()`, change lines 128-143 to only call `createVerificationRecord`:

```javascript
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
}
```

Add tracked properties:
```javascript
@track isSaving = false;
@track errorMessage = '';
```

Then update `createVerificationRecord()` (lines 149-166) to dispatch close and navigate only on success, keep modal open with retry on failure:

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
            // Modal stays open — CSR can retry by clicking Verify again
        });
}
```

Add the same error display HTML as Step 1.1 above the Verify button.

---

#### Step 1.3 — Make Caller Name (required) and Caller Phone (optional) always visible in `memberVerificationModal`

**Files:** `memberVerificationModal.html`, `memberVerificationModal.js`
**Problem:** The Name and Caller Phone input fields are inside `<template if:true={showAdditionalFields}>` (line 94 of the HTML). `showAdditionalFields` is only set to `true` in `handleRepresentativeTypeChange()` (line 152 of the JS), which only fires when Member Type is "Non-Member" and a Representative Type is selected. For standard "Member" calls, there is no caller name or caller phone input visible anywhere on the form.

**Decision:** Caller Name is **required** (Verify blocked if empty). Caller Phone is **optional** (will be auto-populated from ANI when available — see Step 1.7).

**Fix:** Move the caller name and caller phone fields outside the `showAdditionalFields` conditional so they render for all call types. Add a caller info block after the verification checkboxes section and before the Representative Details section, visible whenever `showVerificationSection` is true.

In `memberVerificationModal.html`, add a new block immediately after the verification section's closing `</template>` (after line 67) and before the Representative Details section (line 70):

```html
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
```

Then remove the duplicate Name and Caller Phone inputs from inside the `showAdditionalFields` block (lines 96-106), leaving only the Description textarea there since it is specific to Non-Member flows.

In `memberVerificationModal.js`, add a validation check in `verify()` before the checkbox count check:
```javascript
if (!this.nameValue || this.nameValue.trim() === '') {
    this.errorMessage = 'Caller Name is required.';
    return;
}
```

No other JS changes are needed — `nameValue` and `callerPhoneValue` are already declared as tracked properties (lines 26-27) and their change handlers already exist (lines 159-164). The `verify()` method already reads these values (lines 199, 203).

---

#### Step 1.4 — Make Caller Name (required) and Caller Phone (optional) always visible in `providerVerificationModal`

**Files:** `providerVerificationModal.html`, `providerVerificationModal.js`
**Problem:** The Caller Name and Phone Number fields are inside `<template if:true={isCallingOnBehalf}>` (line 73 of the HTML). They are only visible when the CSR checks the "Are you calling on behalf of a Provider?" checkbox. For direct provider calls, caller identity is never captured.

**Decision:** Same as member path — Caller Name is **required**, Caller Phone is **optional** (auto-populated from ANI when available — see Step 1.7).

**Fix:** Move the Caller Name and Phone Number inputs outside the `isCallingOnBehalf` conditional. They should always be visible on the form. The Caller Type combobox and Phone Extension can remain conditional inside `isCallingOnBehalf` since those are specific to delegated calls.

In `providerVerificationModal.html`, add the caller fields before the "calling on behalf" checkbox (before line 64):

```html
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
```

Then remove the duplicate Caller Name (lines 76-80) and Phone Number (lines 86-90) inputs from inside the `isCallingOnBehalf` block, leaving only the Caller Type combobox and Phone Extension there.

In `providerVerificationModal.js`, add a validation check in `verify()` before the checkbox count check:
```javascript
if (!this.callerName || this.callerName.trim() === '') {
    this.errorMessage = 'Caller Name is required.';
    return;
}
```

No other JS changes are needed — `callerName` and `callerPhoneNumber` are already tracked properties (lines 19, 21) and `handleInputChange` (lines 116-119) already handles them correctly.

---

#### Step 1.5 — Fix imperative data passing in `verifyProvider.js`

**File:** `verifyProvider.js`, `verifyProvider.html`
**Problem:** The `openModal()` method (lines 58-75) uses `setTimeout(() => {...}, 0)` with `this.template.querySelector('c-provider-verification-modal')` to imperatively set data on the modal. Additionally, `selectedProvider()` is a method (line 84), not a getter, so the template binding `healthcare-provider={selectedProvider}` passes `undefined`.

**Fix:** Pass data declaratively through template attributes, matching the pattern already used by `verifyMember`. This requires three changes:

First, change `selectedProvider()` from a method (line 84) to a getter:

```javascript
get selectedProvider() {
    return this.providers.find(provider => provider.recordId === this.selectedProviderId);
}
```

Second, replace the `openModal()` method (lines 58-75) with the simpler version that only sets state:

```javascript
openModal(providerId) {
    this.selectedProviderId = providerId;
    this.isModalOpen = true;
    console.log('Modal open:', this.isModalOpen);
    console.log('Selected Provider ID:', this.selectedProviderId);
}
```

Third, in `verifyProvider.html`, update the `<c-provider-verification-modal>` tag (lines 55-58) to pass all data declaratively:

```html
<c-provider-verification-modal
    healthcare-provider={selectedProvider}
    interaction-id={interactionRecordId}
    interaction-name={interactionName}
    provider-id={selectedProviderId}
    onclose={handleModalClose}>
</c-provider-verification-modal>
```

This eliminates the `setTimeout` race condition entirely. LWC handles attribute binding reactively — when `isModalOpen` becomes true and the modal renders, it receives the current values of all bound properties automatically.

---

#### Step 1.6 — Require Case Origin before Verify in `providerVerificationModal`

**File:** `providerVerificationModal.html`, `providerVerificationModal.js`
**Problem:** Unlike the member modal where both Case Origin and Member Type must be selected before the verification section appears, the provider modal has no such gate. The Case Origin dropdown is always visible but the CSR can click Verify without selecting one, resulting in an empty `caseOriginValue`.

**Decision:** Case Origin is **required** on the provider path, matching the member modal behavior. This ensures consistency and data completeness across both verification paths.

**Fix:** Add a validation check in `verify()` before the checkbox count check:

```javascript
if (!this.caseOriginValue) {
    this.errorMessage = 'Please select a Case Origin before verifying.';
    return;
}
```

Additionally, add the `required` attribute to the Case Origin combobox in the HTML to provide visual indication:

```html
<lightning-combobox name="caseOrigin"
                    label="Case Origin"
                    value={caseOriginValue}
                    options={caseOriginOptions}
                    required
                    onchange={handleCaseOriginChange}></lightning-combobox>
```

---

#### Step 1.7 — Pass ANI (caller phone number) from Genesys payload through to LWC modals

**Files:** `GenesysCTIExtensionClassV2.cls`, `VerifyMemberVisualforcePage.page`, `VerifyHealthcareProviderVisualforcePage.page`, `verifyMember.js`, `verifyProvider.js`, both modal components
**Problem:** The caller's phone number (ANI) is available in the Genesys payload received by `GenesysCTIExtensionClassV2.onScreenPop()`, but it is not passed downstream to the VF pages or LWC components. The ANI exists in `searchValue` (after stripping `+1`) but the redirect URLs only include record IDs (`?ids=[...]`). This means the Caller Phone field in the verification modals must be manually entered even though the system already knows the number.

**Decisions:**
- Auto-populate the Caller Phone field from the ANI when available. CSR can edit if needed.
- **ANI source:** Use `searchValue` (the normalized top-level payload value, already stripped of `+1` country code). This is the same value used for record matching, so the auto-filled phone is consistent with what the system searched on. Do not use `sf_ANI` (the nested IVR field) — `searchValue` is authoritative.
- **Storage format:** Raw digits as received from the Apex normalization. No additional formatting applied in the LWC.

**Fix:** This requires threading the ANI through the existing data pipeline:

1. **Apex (GenesysCTIExtensionClassV2.cls):** Add `searchValue` (ANI) as a URL parameter in both redirect URLs. The existing code already URL-encodes the `ids` parameter; apply the same pattern to `ani`:
   ```apex
   // For member redirect (around line ~108):
   // Note: the existing code already URL-encodes the serialized IDs.
   // Add &ani= with the same encoding pattern:
   String aniParam = (searchValue != null) ? '&ani=' + EncodingUtil.urlEncode(searchValue, 'UTF-8') : '';
   String url = '/apex/VerifyMemberVisualforcePage?ids=' + EncodingUtil.urlEncode(JSON.serialize(orderedAccountIds), 'UTF-8') + aniParam;

   // For provider redirect (around line ~167):
   String url = '/apex/VerifyHealthcareProviderVisualforcePage?ids=' + EncodingUtil.urlEncode(JSON.serialize(orderedHCPIds), 'UTF-8') + aniParam;
   ```
   **Important:** Match the existing URL encoding pattern for `ids` — check the current code to see whether it uses `EncodingUtil.urlEncode` on the serialized IDs or concatenates them raw. The snippet above assumes proper encoding; adjust to match.

2. **VF Page Controllers:** Read the `ani` parameter and expose it as a property:
   ```apex
   public String callerANI { get; set; }
   // In constructor:
   callerANI = ApexPages.currentPage().getParameters().get('ani');
   ```

3. **VF Pages:** Pass the ANI to the LWC component as an attribute:
   ```javascript
   $Lightning.createComponent("c:verifyMember", {
       accounts: mappedRecords,
       callerANI: '{!JSENCODE(callerANI)}'
   }, ...);
   ```

4. **Parent LWCs (verifyMember, verifyProvider):** Accept the `callerANI` as an `@api` property and pass it to the modal via template attribute.

5. **Modal LWCs:** Accept `caller-a-n-i` as an `@api` property and use it to pre-populate the Caller Phone field if present. Store as raw digits (no formatting):
   ```javascript
   connectedCallback() {
       if (this.callerANI) {
           this.callerPhoneValue = this.callerANI;  // member modal
           // or: this.callerPhoneNumber = this.callerANI;  // provider modal
       }
   }
   ```

This is a straightforward data pipeline addition. The ANI is already available in the Apex entry point — it just needs to be forwarded through each layer.

---

### Phase 2: Best Practices Improvements

---

#### Step 2.1 — Add try-catch to `GenesysCTIExtensionClassV2.onScreenPop()`

**File:** `GenesysCTIExtensionClassV2.cls`
**Problem:** The entire `onScreenPop` method has zero exception handling. While the screen pop works in production today, any future data anomaly would cause a silent failure with no logging and no fallback.

**Fix:** Wrap the entire method body in a try-catch that returns `defaultScreenPop` on failure and logs the exception.

Replace the method opening:

```apex
public String onScreenPop(String jsonData) {

    // Deserialize the inbound JSON data to a Map
    Map<String, Object> deserializedData = (Map<String, Object>) JSON.deserializeUntyped(jsonData);
```

With:

```apex
public String onScreenPop(String jsonData) {
    try {
        // Deserialize the inbound JSON data to a Map
        Map<String, Object> deserializedData = (Map<String, Object>) JSON.deserializeUntyped(jsonData);
```

And replace the final return block:

```apex
    // If no specific conditions are met, default to the standard screen pop behavior
    dataToReturn.put('defaultScreenPop', true);
    return JSON.serialize(dataToReturn);
}
```

With:

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

This guarantees the screen pop never crashes silently. Even when matching fails, the CSR gets the default Genesys screen pop instead of nothing.

---

#### Step 2.2 — Protect the RecordType query in `GenesysCTIExtensionClassV2`

**File:** `GenesysCTIExtensionClassV2.cls`
**Problem:** Line 117 assigns the SOQL result directly to a single `RecordType` variable. If no matching RecordType exists, this throws `System.QueryException`, crashing the screen pop for every call that reaches the provider search path.

**Fix:** Replace lines 117-118:

```apex
RecordType rt = [SELECT Id FROM RecordType WHERE SObjectType = 'HealthcareProvider' AND Name = 'Supplier Location' LIMIT 1];
String recordTypeId = rt.Id;
```

With:

```apex
List<RecordType> rtList = [SELECT Id FROM RecordType WHERE SObjectType = 'HealthcareProvider' AND Name = 'Supplier Location' LIMIT 1];
if (rtList.isEmpty()) {
    System.debug(LoggingLevel.ERROR, 'RecordType "Supplier Location" not found for HealthcareProvider. Skipping provider search.');
    dataToReturn.put('defaultScreenPop', true);
    return JSON.serialize(dataToReturn);
}
String recordTypeId = rtList[0].Id;
```

---

#### Step 2.3 — (DEFERRED) Populate Interaction records with call context

**Files:** `verifyMember.js`, `verifyProvider.js`
**Problem:** Both components create `UST_EPLUS__Interaction__c` records with `const fields = {};` — no fields populated at all. In `verifyMember.js` line 95, and in `verifyProvider.js` line 42. The resulting Interaction record has no connection to the call, the member, or the provider.

**Decision: Deferred to a future phase.** This is a managed package object (`UST_EPLUS__Interaction__c`) and determining which fields to populate requires inspecting the object schema and coordinating with the managed package data model owner. The core call-flow fixes (Phase 1) should be deployed and verified first. The empty Interaction record is a data completeness gap, not a data loss bug.

**Future implementation:** Inspect the object schema to determine available fields:
```
sf sobject describe UST_EPLUS__Interaction__c --target-org coaGenesys
```
Then populate at minimum the Account/HealthcareProvider lookup field and any available call context fields (ANI, call timestamp, etc.).

---

#### Step 2.4 — Replace hardcoded RecordType IDs in `HealthcareProviderTrigger` (SEPARATE DEPLOYMENT)

**File:** `HealthcareProviderTrigger.trigger`
**Problem:** Lines 3-4 hardcode production RecordType IDs:
```apex
String triggeringRecordTypeId = '0125f000000iIQTAA2';
String searchingRecordTypeId = '0125f000000zJzmAAE';
```
These IDs are different in every sandbox and scratch org, meaning this trigger silently does nothing in any non-production environment.

**Fix:** Replace lines 2-4:

```apex
// Define record type IDs
String triggeringRecordTypeId = '0125f000000iIQTAA2';
String searchingRecordTypeId = '0125f000000zJzmAAE';
```

With:

```apex
// Dynamically resolve record type IDs
Id triggeringRecordTypeId = Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Supplier Location').getRecordTypeId();
Id searchingRecordTypeId = Schema.SObjectType.HealthcareProvider.getRecordTypeInfosByName().get('Prospective Provider').getRecordTypeId();
```

This resolves the correct IDs at runtime in any environment. The `getRecordTypeInfosByName()` method is cached by the platform and does not count against SOQL limits.

**Deployment note:** This fix should be deployed **separately** from the Phase 1 call-flow bug fixes. The trigger affects provider data management (deduplication on insert), not the call verification flow. Deploying it independently reduces risk and isolates any impact.

---

#### Step 2.5 — Fix the `handleInputChange` combobox issue in `providerVerificationModal.js`

**File:** `providerVerificationModal.js`, `providerVerificationModal.html`
**Problem:** The `handleInputChange` method (lines 116-119) uses `this[name] = value` where `name` comes from `event.target.name`. The Caller Type combobox has `name="callerType"` but the tracked property is `callerTypeValue`. So `this["callerType"] = value` sets a non-reactive property. Additionally, `callerTypeValue` is never saved to the Verification Information record.

**Fix:** Give the Caller Type combobox its own change handler. In `providerVerificationModal.html`, change the combobox's `onchange` (line 85):

```html
<lightning-combobox name="callerType"
                    label="Caller Type"
                    value={callerTypeValue}
                    options={callerTypeOptions}
                    onchange={handleCallerTypeChange}></lightning-combobox>
```

Add the handler in `providerVerificationModal.js`:

```javascript
handleCallerTypeChange(event) {
    this.callerTypeValue = event.detail.value;
}
```

If caller type should be persisted, also add it to the `verificationData` object in `verify()` and map it to the appropriate field in `createVerificationRecord()`.

---

#### Step 2.6 — Make sharing mode explicit on page controllers

**Files:** `GC_Account_PageController.cls`, `GC_HealthcareProvider_PageController.cls`
**Problem:** Both classes are declared as `public class` without an explicit sharing keyword. They implicitly run in system mode.

**Decision:** System mode is **intentional** for this call center workflow. CSRs handling inbound calls need to see all matched records regardless of record ownership or sharing rules — this is a "break glass" call center pattern. FLS enforcement is also not required; all CSRs who reach this workflow need to see SSN/DOB/TIN fields to perform caller verification. Access to the verification workflow is controlled at the entry point (Genesys screen pop routing and Call Center configuration), not at the field level.

**Fix:** Make the sharing mode explicit by adding `without sharing` to the class declarations. This documents the intentional decision and prevents future developers from mistakenly adding `with sharing`.

In `GC_Account_PageController.cls`, change line 1:
```apex
public class GC_Account_PageController {
```
To:
```apex
public without sharing class GC_Account_PageController {
```

Apply the same change to `GC_HealthcareProvider_PageController.cls`.

---

#### Step 2.7 — Add exception handling to VF page controllers

**Files:** `GC_Account_PageController.cls`, `GC_HealthcareProvider_PageController.cls`
**Problem:** Both constructors deserialize the `ids` URL parameter with `JSON.deserialize(recordIdsJson, List<Id>.class)` (line 10 in both files). If the parameter contains invalid JSON or non-Id values, the constructor throws an unhandled exception and the VF page shows a Salesforce error page.

**Fix:** Wrap the constructor logic in a try-catch. For `GC_Account_PageController.cls`:

```apex
public GC_Account_PageController() {
    fetchedRecords = new List<Account>();
    try {
        String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
        if (String.isNotBlank(recordIdsJson)) {
            List<Id> recordIds = (List<Id>) JSON.deserialize(recordIdsJson, List<Id>.class);
            if (!recordIds.isEmpty()) {
                Map<Id, Account> accountMap = new Map<Id, Account>([
                    SELECT Id, Name, Phone, UST_EPLUS__Member_ID__c, UST_EPLUS__SSN_Masked__c,
                           PersonBirthdate, HealthCloudGA__BirthDate__pc, UST_EPLUS__PersonBirthDate__c,
                           PersonMailingStreet, PersonMailingCity, PersonMailingState,
                           PersonMailingPostalCode, PersonMailingCountry, Last_4_SSN_V2__c
                    FROM Account
                    WHERE Id IN :recordIds
                ]);
                for (Id recordId : recordIds) {
                    if (accountMap.containsKey(recordId)) {
                        fetchedRecords.add(accountMap.get(recordId));
                    }
                }
            }
        }
    } catch (Exception e) {
        System.debug(LoggingLevel.ERROR, 'GC_Account_PageController error: ' + e.getMessage());
    }
    fetchedRecordsJson = JSON.serialize(fetchedRecords);
}
```

Apply the same pattern to `GC_HealthcareProvider_PageController.cls`.

---

#### Step 2.8 — (MERGED INTO STEPS 1.1/1.2) Error feedback on save failure

**Note:** This step has been incorporated into Steps 1.1 and 1.2. The save-before-close fix now includes error handling: on save failure, the modal stays open with an error message and the CSR can retry. No separate implementation step is needed.

---

#### Step 2.9 — Remove the dead recursive modal template from `memberVerificationModal.html`

**File:** `memberVerificationModal.html`
**Problem:** Lines 126-141 contain a `<template if:true={isModalOpen}>` block that renders a nested `<c-member-verification-modal>` inside itself. `isModalOpen` is not declared in this component, so the block never renders. It is dead code.

**Fix:** Delete lines 125-141 entirely.

---

### Phase 3: Medium/Low-Severity Cleanup

---

#### Step 3.1 — Add JSENCODE to VF page merge fields

**Files:** `VerifyMemberVisualforcePage.page`, `VerifyHealthcareProviderVisualforcePage.page`
**Problem:** Both pages use `JSON.parse('{!fetchedRecordsJson}')` which injects the Apex-serialized JSON directly into JavaScript. If the data contains single quotes or backslashes, the JavaScript will break.

**Fix:** Change in both VF pages:
```javascript
var fetchedRecords = JSON.parse('{!fetchedRecordsJson}');
```
To:
```javascript
var fetchedRecords = JSON.parse('{!JSENCODE(fetchedRecordsJson)}');
```

---

#### Step 3.2 — Move trigger logic to a handler class

**File:** `HealthcareProviderTrigger.trigger`
**Problem:** All business logic (47 lines) is inline in the trigger body. This makes the code harder to test, prevents reuse, and doesn't support recursion guards.

**Fix:** Create a new class `HealthcareProviderTriggerHandler` that contains the current trigger logic in a static method:

```apex
public with sharing class HealthcareProviderTriggerHandler {
    public static void handleAfterInsert(List<HealthcareProvider> newRecords) {
        // Move trigger body here,
        // replacing Trigger.new with the newRecords parameter
        // and using dynamic RecordType resolution from Step 2.4
    }
}
```

Then reduce the trigger to a single delegation:

```apex
trigger HealthcareProviderTrigger on HealthcareProvider (after insert) {
    HealthcareProviderTriggerHandler.handleAfterInsert(Trigger.new);
}
```

---

#### Step 3.3 — Improve error logging in `DelayedDeleteHandler`

**File:** `DelayedDeleteHandler.cls`
**Problem:** Lines 11-13 catch exceptions but only write to `System.debug`, which is not monitored in production.

**Fix:** At minimum, add the record IDs to the debug output:

```apex
public void execute(QueueableContext context) {
    try {
        delete [SELECT Id FROM HealthcareProvider WHERE Id IN :idsToDelete];
    } catch(Exception e) {
        System.debug(LoggingLevel.ERROR, 'DelayedDeleteHandler failed for IDs: ' + idsToDelete + ' | Error: ' + e.getMessage());
    }
}
```

For a production-grade fix, consider logging to a custom object or publishing a platform event.

---

#### Step 3.4 — Remove `@track` from primitive properties

**Files:** All LWC JavaScript files
**Problem:** `@track` is used on primitive properties throughout. Since Spring '20, LWC automatically tracks changes to primitive properties. `@track` is only needed for deep mutation tracking on objects and arrays.

**Fix:** Remove `@track` from all primitive property declarations. Keep `@track` only on `checkedValues = []` (array mutations need tracking) and `verificationData = {}` in `verifyMember.js`.

---

#### Step 3.5 — Remove or archive legacy screen pop classes

**Files:** `GenesysCTIExtensionClass.cls`, `MyScreenPopExtension5.cls`, `MyScreenPopExtension6.cls`, `MyScreenPopExtension7.cls` and their corresponding test classes

**Problem:** Four inactive implementations of the screen pop handler remain in the org. They create maintenance confusion and could be accidentally activated via Genesys Call Center settings.

**Fix:** After confirming with the Genesys Cloud Call Center configuration that only `GenesysCTIExtensionClassV2` is referenced as the active extension class:
1. Add a header comment to each: `// DEPRECATED - replaced by GenesysCTIExtensionClassV2`
2. If org policy allows, delete the classes and their test classes entirely

---

#### Step 3.6 — Add SOQL result limits to `GenesysCTIExtensionClassV2`

**File:** `GenesysCTIExtensionClassV2.cls`
**Problem:** The Account and HCP queries on lines 68, 78, 88, 128, 138, 148 have no `LIMIT` clause. A common phone number could match many records.

**Fix:** Add `LIMIT 50` (or another reasonable cap) to each query. For example:

```apex
List<Account> bothMatchAccounts = [SELECT Id FROM Account WHERE Phone = :searchValue AND Last_4_SSN_V2__c = :sf_last4SSN LIMIT 50];
```

Apply the same limit to all six queries.

---

#### Step 3.7 — Clean up unused class-level variables in `GenesysCTIExtensionClassV2`

**File:** `GenesysCTIExtensionClassV2.cls`
**Problem:** `sf_ANI` (line 4) and `sf_RecordId` (line 5) are extracted from the JSON payload but never referenced in any query or logic.

**Fix:** Remove the class-level declarations (lines 4-5) and their assignments (lines 37-41). If they may be useful for future development, convert them to local variables with a comment explaining their purpose.

---

#### Step 3.8 — (DEFERRED) Phone number normalization in `GenesysCTIExtensionClassV2`

**File:** `GenesysCTIExtensionClassV2.cls`
**Problem:** Lines 52-55 only strip the `+1` prefix. If phone formats ever diverge between Genesys and Salesforce, the exact-match SOQL queries will fail.

**Decision: Deferred.** The screen pop works consistently in production, meaning the current phone formats between Genesys and Salesforce are compatible. There is no evidence of format mismatches. Additionally, implementing digits-only normalization on the inbound side alone is incomplete — if Account.Phone values are stored with formatting (e.g., `(303) 555-1234`), the SOQL `WHERE Phone = :searchValue` will still fail even with a normalized search value. The full fix requires a digits-only formula field on Account/HCP and querying against that field, which is a broader data model change.

**Future implementation (if format mismatches are observed):**
```apex
// Normalize searchValue to digits only for consistent matching
if (searchValue != null) {
    searchValue = searchValue.replaceAll('[^0-9]', '');
    System.debug('Normalized CTI Search Value (digits only): ' + searchValue);
}
```
Plus a digits-only formula field on Account and HealthcareProvider to query against.

---

### Implementation Priority

| Order | Step | Effort | Impact | Fixes | Deployment |
|---|---|---|---|---|---|
| 1 | 1.1 + 1.2 (save-before-close with retry) | Medium | Ensures verification records are saved; CSR can retry on failure | Verification data loss | Phase 1 deploy |
| 2 | 1.3 + 1.4 (caller name required, phone visible) | Medium | Makes caller identity capturable for all call types | Caller name/phone missing | Phase 1 deploy |
| 3 | 1.5 (declarative data passing) | Medium | Eliminates provider modal data race condition | Provider verification data | Phase 1 deploy |
| 4 | 1.6 (Case Origin required for provider) | Small | Data completeness; matches member behavior | Missing Case Origin | Phase 1 deploy |
| 5 | 1.7 (ANI pass-through for phone auto-fill) | Medium | Auto-populates caller phone from Genesys data | Manual phone entry | Phase 1 deploy |
| 6 | 2.1 (try-catch) | Small | Prevents silent screen pop crashes | Resilience | Phase 2 deploy |
| 7 | 2.2 (RecordType guard) | Small | Prevents crash on missing RecordType | Resilience | Phase 2 deploy |
| 8 | 2.5 (callerType combobox fix) | Small | Caller type properly tracked | Data accuracy | Phase 2 deploy |
| 9 | 2.6 + 2.7 (explicit without sharing + error handling) | Medium | Code clarity and reliability | Best practices | Phase 2 deploy |
| 10 | 2.9 (remove dead code) | Small | Code quality | Cleanup | Phase 2 deploy |
| 11 | 2.4 (hardcoded RecordType IDs) | Small | Trigger works in all environments | Sandbox testing | **Separate deploy** |
| 12 | 3.1-3.7 (cleanup) | Low | Maintainability | Long-term health | Phase 3 deploy |

### Deferred Items

| Item | Reason | Prerequisite |
|---|---|---|
| 2.3 — Populate Interaction records | Managed package object; needs schema inspection and coordination with data model owner | `sf sobject describe UST_EPLUS__Interaction__c` |
| 3.8 — Phone normalization | No evidence of production issues; full fix requires digits-only formula fields on Account/HCP | Evidence of format mismatches |
