export type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

export const FAQ_CATEGORIES = [
  "Platform Overview",
  "Authentication & Identity",
  "Verifiable Credentials",
  "Authorization & Policy",
  "Security & Compliance",
  "Developers & Integration"
] as const;

export const FAQS: FaqItem[] = [
  // Platform Overview
  {
    id: "what-is-artagon",
    category: "Platform Overview",
    question: "What is the Artagon Identity Platform?",
    answer: "Artagon is a unified identity and authorization platform that combines an OIDC 2.1/OpenID Provider, GNAP Authorization Server, verifiable credentials infrastructure, device/app attestation, and Zanzibar-style policy engine. It provides a complete solution for modern, high-assurance identity and access management for both machines and humans."
  },
  {
    id: "oidc-gnap-support",
    category: "Platform Overview",
    question: "Does Artagon support both OIDC 2.1 and GNAP?",
    answer: "Yes—Artagon implements OIDC 2.1 with hardened OAuth profiles (PAR, JAR/JARM, RAR, DPoP, mTLS) and GNAP with proof-of-possession and continuation handles. You can use either protocol based on your needs, and we provide migration paths between them."
  },
  {
    id: "who-should-use",
    category: "Platform Overview",
    question: "Who should use Artagon?",
    answer: "Artagon is ideal for enterprises requiring high-assurance identity (finance, healthcare, government), SaaS platforms needing multi-tenant authorization, IoT/device ecosystems requiring attestation, and any organization moving toward verifiable credentials and decentralized identity while maintaining compatibility with existing OIDC infrastructure."
  },
  {
    id: "cloud-or-self-hosted",
    category: "Platform Overview",
    question: "Is Artagon cloud-hosted or self-hosted?",
    answer: "Artagon is available as a managed cloud service (id.artagon.com) and as a self-hosted deployment for enterprises requiring on-premises or private cloud installation. Both options provide the same core features with different operational models."
  },

  // Authentication & Identity
  {
    id: "passkey-support",
    category: "Authentication & Identity",
    question: "Do you support passkeys and verifiable credentials?",
    answer: "Yes—passkey/WebAuthn is the primary authentication method in Artagon. We also issue and verify SD-JWT and BBS+ verifiable credentials via OID4VCI/OID4VP, enabling selective disclosure and unlinkable presentations for privacy-preserving identity."
  },
  {
    id: "device-attestation",
    category: "Authentication & Identity",
    question: "What is device attestation and why does it matter?",
    answer: "Device attestation proves that a client is running on genuine hardware/software (e.g., Android Play Integrity, Apple App Attest, WebAuthn). This binds authentication and authorization tokens to attested devices, making stolen credentials useless on compromised or rooted devices. It's the foundation of zero-trust security for mobile and IoT."
  },
  {
    id: "legacy-password",
    category: "Authentication & Identity",
    question: "Can I still use traditional username/password?",
    answer: "Yes, but we strongly encourage passkey-primary workflows. Artagon supports username/password for backward compatibility, but adds hardened profiles (DPoP token binding, mTLS) by default. We provide migration tooling to help users transition to passkeys without disrupting existing flows."
  },
  {
    id: "multi-factor",
    category: "Authentication & Identity",
    question: "How does multi-factor authentication work?",
    answer: "Passkeys are inherently multi-factor (possession + biometric/PIN). For legacy flows, Artagon supports TOTP, SMS (discouraged), and push notifications. We recommend passkeys + device attestation as the modern alternative to traditional MFA."
  },

  // Verifiable Credentials
  {
    id: "vc-what-are",
    category: "Verifiable Credentials",
    question: "What are verifiable credentials?",
    answer: "Verifiable Credentials (VCs) are cryptographically signed, tamper-proof digital statements about identity attributes (e.g., age, license, employment). Unlike OIDC ID tokens, VCs support selective disclosure (share only necessary claims), unlinkable presentations (prevent tracking), and work across organizational boundaries without tight coupling."
  },
  {
    id: "sd-jwt-bbs",
    category: "Verifiable Credentials",
    question: "What's the difference between SD-JWT and BBS+?",
    answer: "SD-JWT (Selective Disclosure JWT) allows holders to reveal only specific claims from a credential using hash disclosure. BBS+ uses zero-knowledge proofs for unlinkable presentations—each presentation is cryptographically unique, preventing correlation across verifiers. SD-JWT is simpler and more widely supported; BBS+ offers stronger privacy guarantees."
  },
  {
    id: "vc-oidc-bridge",
    category: "Verifiable Credentials",
    question: "Can I use VCs with existing OIDC apps?",
    answer: "Yes—Artagon bridges VCs to OIDC via OID4VP (OpenID for Verifiable Presentations). Legacy OIDC apps can request VCs as part of the authorization flow and receive them as claims in ID tokens, gaining high-assurance attributes without rewriting their applications."
  },
  {
    id: "vc-revocation",
    category: "Verifiable Credentials",
    question: "How does credential revocation work?",
    answer: "Artagon implements StatusList2021 for privacy-preserving revocation: verifiers check a bitstring published by the issuer (one bit per credential) without revealing which credential is being checked. We also support Merkle-tree-based revocation for transparency and auditability."
  },

  // Authorization & Policy
  {
    id: "authorization-model",
    category: "Authorization & Policy",
    question: "How does authorization work?",
    answer: "Artagon uses a hybrid model: a Zanzibar-style relationship graph for fast, scalable checks (e.g., 'does user A have access to resource B?') combined with a Policy Decision Point (PDP) supporting XACML, Cedar, or OPA for fine-grained conditions, obligations, and context-aware decisions."
  },
  {
    id: "zanzibar-what",
    category: "Authorization & Policy",
    question: "What is Zanzibar and why use it?",
    answer: "Zanzibar is Google's relationship-based authorization system used by Drive, Calendar, and YouTube. It models permissions as a graph of relationships (user:alice is member of group:eng) and evaluates checks in milliseconds even at massive scale. Artagon implements the Zanzibar model for ReBAC (Relationship-Based Access Control)."
  },
  {
    id: "policy-languages",
    category: "Authorization & Policy",
    question: "Which policy languages do you support?",
    answer: "Artagon's PDP supports XACML 3.0, Cedar (AWS), and Open Policy Agent (OPA/Rego). You can choose based on your ecosystem and team expertise. All policies can be versioned in Git and deployed via CI/CD for policy-as-code workflows."
  },
  {
    id: "decision-latency",
    category: "Authorization & Policy",
    question: "How fast are authorization decisions?",
    answer: "Zanzibar graph checks typically complete in <10ms at p95. PDP policy evaluations add 5-20ms depending on complexity. Artagon caches frequently-accessed decisions and uses sharding for horizontal scale, ensuring low latency even under high load."
  },

  // Security & Compliance
  {
    id: "dpop-mtls",
    category: "Security & Compliance",
    question: "What are DPoP and mTLS token binding?",
    answer: "DPoP (Demonstrating Proof-of-Possession) and mTLS (Mutual TLS) bind access tokens to specific clients, preventing token theft attacks. Even if an attacker steals a token, they can't use it without the client's private key. This is required for high-security contexts like financial services."
  },
  {
    id: "compliance-frameworks",
    category: "Security & Compliance",
    question: "What compliance frameworks does Artagon support?",
    answer: "Artagon provides building blocks for NIST 800-63 (digital identity guidelines), eIDAS (EU electronic identification), PSD2/SCA (payment services), FIPS 140-2/3 (cryptographic modules), and HIPAA (healthcare privacy). We also offer audit logs, consent management, and identity proofing integrations for regulated industries."
  },
  {
    id: "identity-proofing",
    category: "Security & Compliance",
    question: "Do you support identity proofing (KYC)?",
    answer: "Yes—Artagon offers a pluggable identity proofing API that integrates with providers like Onfido, Jumio, and Persona for document verification and biometric matching. Successful proofing results in a Proofing VC issued at IAL2/AAL2 (NIST) or equivalent eIDAS levels."
  },
  {
    id: "data-privacy",
    category: "Security & Compliance",
    question: "How does Artagon handle data privacy?",
    answer: "Privacy-by-design: selective disclosure minimizes data sharing, unlinkable presentations prevent tracking, and all PII is encrypted at rest. Artagon supports GDPR data subject rights (access, deletion, portability) and provides granular consent management for attribute release."
  },

  // Developers & Integration
  {
    id: "getting-started",
    category: "Developers & Integration",
    question: "How do I get started as a developer?",
    answer: "Sign up at console.artagon.com for a free sandbox tenant, explore the interactive playground at play.artagon.com, and follow our quickstart guides at docs.artagon.com. We provide SDKs for Java, Rust, JS/TS, Go, and Swift, plus GraphQL and REST APIs."
  },
  {
    id: "sdk-support",
    category: "Developers & Integration",
    question: "What SDKs and languages do you support?",
    answer: "Official SDKs: Java, Rust, JavaScript/TypeScript, Go, Swift. All SDKs handle DPoP generation, key rotation, and token refresh automatically. We also provide OpenAPI specs and GraphQL schemas for custom integrations."
  },
  {
    id: "migration-from-auth0",
    category: "Developers & Integration",
    question: "Can I migrate from Auth0, Okta, or other providers?",
    answer: "Yes—Artagon provides migration tooling and compatibility layers for Auth0, Okta, Keycloak, and generic OIDC providers. We support gradual migration (run both systems in parallel) and bulk user import with optional password hash migration."
  },
  {
    id: "api-rate-limits",
    category: "Developers & Integration",
    question: "What are the API rate limits?",
    answer: "Sandbox: 100 req/min. Production plans start at 1,000 req/min (Starter) to unlimited (Enterprise). We use token bucket rate limiting with burst allowances. Contact sales for custom limits or dedicated infrastructure."
  },
  {
    id: "support-sla",
    category: "Developers & Integration",
    question: "What support and SLAs do you offer?",
    answer: "Free tier: community support via GitHub Discussions. Paid plans include email support (response <24h), Starter adds Slack support (<4h), Pro adds phone support (<1h), Enterprise includes dedicated Slack channel and 99.95% uptime SLA with multi-region failover."
  }
];
