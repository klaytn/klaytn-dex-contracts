# Klaytn-DEX Documentation

In this repository you can find Klaytn-DEX specification as well as audit reports for the project.

## Specification

[Klaytn-DEX Specification](./dex-specification.md) describes the project design in detail. It defines Klaytn-DEX terminology, specifies how Dex smart contracts operate, discusses security concerns, and offers the general information about the project.

The document specifies the core smart contracts (`DexFactory` and `DexPair`), periphery smart contracts (`DexRouter`, `DexLibrary`) designed to support domain-specific interactions with the core, staking and farming contracts (`Farming`, `StakingFactory`, `StakingInitializable`), and the contracts regulating ownership and role-base access to DEX functionality (`Ownable`, `AccessControl`).

For each contract, the main functionality is documented as well as all the calculations (e.g. reward debt) that are happening in them. 

## Audit Reports

The reports present the findings of audits conducted by independent auditors.

The audits include architecture review, unit testing, functional testing, computer-aided verification, and manual review. Each report lists the findings, test results, and code coverage. For each finding, you can see its severity and status.

Here are the audit reports for Klaytn-DEX:

- [Quantstamp Audit Report (October 2022)](../audits/quantstamp/report.pdf)
