# Architecture and operational notes

The browser calls Next.js server routes for Grants.gov data and AI work. Grant data is public and cached briefly. Profile extraction, fit analysis, planning, and review use validated structured output. Writing and revisions use an incremental section parser and server-sent events.

The draft pipeline sends the organization facts and funding synopsis to each relevant stage. A deterministic final numeric check flags figures absent from this supplied evidence. It cannot establish the truth of the source profile or verify semantic relationships. Users must review all generated claims.

Firebase Hosting proxies the application to a Node.js standalone Next.js container on Cloud Run. The status endpoint supplies a public API origin so long AI requests bypass the Hosting proxy timeout. CORS allows the two public Firebase origins. The runtime service account can read the one API secret, and the deployment caps instances and request volume.

Browser localStorage holds workspace data. Validated hydration prevents malformed stored objects from crashing application pages. Editing the organization invalidates the previous workspace. Section edits and pipeline notes persist after refresh. There is no server-side user database or multi-device sync.

API errors use generic client-safe messages. Model keys never enter public environment variables. The OpenAI adapter sets `store: false`. This does not claim zero retention by infrastructure or the model provider.

Remaining production work: authenticated users, durable shared workspaces, distributed quotas, full-notice compliance extraction, automated provider-failure integration tests, calibrated recommendation evaluation, and independent user testing.
