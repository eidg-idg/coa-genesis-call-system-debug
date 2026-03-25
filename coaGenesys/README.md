# COA Genesys Call System

Colorado Access (COA) Genesys Cloud CTI integration for Salesforce Health Cloud. This system handles inbound call screen pops, caller verification, and interaction logging for both **Member** (Account) and **Provider** (HealthcareProvider) call paths.

## Architecture

```
Genesys Cloud (PureCloud CTI)
        │
        ▼
GenesysCTIExtensionClassV2          ← Apex: parses JSON payload, queries SF records
        │
        ├── Member Path ──▶ VerifyMemberVisualforcePage
        │                        └── MyLWCApp (Aura)
        │                              └── verifyMember (LWC)
        │                                    └── memberVerificationModal (LWC)
        │
        └── Provider Path ▶ VerifyHealthcareProviderVisualforcePage
                                 └── MyProviderLWCApp (Aura)
                                       └── verifyProvider (LWC)
                                             └── providerVerificationModal (LWC)
```

### Call Flow

1. **Screen Pop** — Genesys sends a JSON payload containing the caller’s phone (ANI) and search attributes (Last 4 SSN or NPI)
2. **Record Matching** — `GenesysCTIExtensionClassV2` queries Account or HealthcareProvider records with a priority ranking: both fields match > single field match > phone-only match
3. **Verification Page** — Matched records are displayed in a list via a Visualforce page hosting an LWC through Lightning Out (Aura `ltng:outApp`)
4. **Identity Verification** — CSR clicks a record to open a verification modal, confirms caller identity via required checkboxes, and enters caller details
5. **Record Creation** — An `Interaction` record is created on selection; a `Verification Information` record is saved on modal completion
6. **Navigation** — CSR is routed to the verified record’s detail page

## Project Structure

```
coaGenesys/
├── force-app/main/default/
│   ├── classes/            # Apex classes (CTI extension, controllers, tests)
│   ├── lwc/                # Lightning Web Components (verification UIs)
│   ├── aura/               # Aura apps (Lightning Out containers)
│   ├── pages/              # Visualforce pages (entry points)
│   └── triggers/           # HealthcareProvider deduplication trigger
├── dev/                    # Analysis docs and remediation plans
├── config/                 # SF CLI configuration
├── manifest/               # Deployment manifests
└── scripts/                # Utility scripts
```

## Key Components

### Apex Classes

| Class | Purpose |
|-------|---------|
| `GenesysCTIExtensionClassV2` | CTI screen pop entry point — parses Genesys payload, queries records, returns navigation URL |
| `GC_Account_PageController` | VF controller for member verification — queries and serializes Account data |
| `GC_HealthcareProvider_PageController` | VF controller for provider verification — queries and serializes HealthcareProvider data |
| `HealthcareProviderTrigger` | Deduplicates HealthcareProvider records by NPI on insert |
| `DelayedDeleteHandler` | Queueable handler for async duplicate record cleanup |

### LWC Components

| Component | Purpose |
|-----------|---------|
| `verifyMember` | Displays matched member accounts in a table with verification action |
| `memberVerificationModal` | Two-step member verification form (Case Origin/Member Type, then identity checks) |
| `verifyProvider` | Displays matched healthcare providers in a table with verification action |
| `providerVerificationModal` | Provider verification form with Case Origin and identity checks |

### Custom Objects (Managed Package)

| Object | Purpose |
|--------|---------|
| `UST_EPLUS__Interaction__c` | Tracks CSR call interactions |
| `UST_EPLUS__Verification_Information__c` | Stores verification details — caller name, case origin, linked member/provider |

## Development

### Prerequisites

- Salesforce CLI (sf v2+)
- Node.js (for linting and LWC Jest tests)
- Access to the COA Salesforce Health Cloud org
- Genesys Cloud (PureCloud) managed package installed in the target org

### Setup

```bash
npm install                  # Install dev dependencies (ESLint, Prettier, Jest)
sf org login web             # Authenticate to your Salesforce org
```

### Deploy

```bash
sf project deploy start --source-dir force-app --target-org <alias>
```

### Test

```bash
# Apex tests
sf apex run test --target-org <alias> --code-coverage

# LWC Jest tests
npm test
```

## Documentation

Detailed analysis and remediation plans are in the `dev/` directory:

- `genesysCodeAnalysis.md` — Line-by-line technical breakdown and root cause analysis
- `genesysCodeAnalysisSummary.md` — Executive summary of issues and decisions
- `genesysCodeRemPlan.md` — Step-by-step remediation plan with code snippets
- `clientReview.md` — Client-facing summary and design decisions

## Tech Stack

- **Salesforce API:** v65.0
- **Apex** — Server-side logic and SOQL queries
- **Lightning Web Components** — Verification UI
- **Aura** — Lightning Out app containers
- **Visualforce** — Entry point pages bridging CTI to LWC
- **Genesys Cloud CTI** — `purecloud.CTIExtension.ScreenPop` interface
- **Build Tools** — ESLint, Prettier, Husky pre-commit hooks
