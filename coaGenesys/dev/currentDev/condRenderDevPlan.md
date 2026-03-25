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

The EPlus workflow findings will be documented in a separate detailed findings markdown file, produced through direct observation of the EPlus managed package behavior in the sandbox environment. This findings document will serve as the requirements baseline for all implementation work in this plan.
