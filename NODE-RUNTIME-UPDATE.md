# Node.js runtime update — October 2026

Status: repository candidate only. Production runtime, exposure, and compromise remain unverified.

Use Node 24.22.1 (patched LTS) for builds and native Node services, with engines >=24.22.1 <25. Exact selectors are deliberate; review future security releases rather than allowing an untested major upgrade. Dependency resolutions and application behavior are unchanged by this patch.

## Deployment dependencies and verification

- Render NODE_VERSION overrides .node-version, which overrides .nvmrc and engines.node. Check effective dashboard/environment-group settings and each service root before release. Committing a Blueprint does not prove it was applied.
- Capture each service ID, source repository/root/branch, current deploy ID/commit, effective Node selector, and actual node --version in the running instance. Build logs establish build runtime only unless tied to the same native runtime deployment; HTTP health alone is insufficient.
- Keep pnpm 10.5.0 where already selected. Use clean, locked installation; do not reuse Node20 native binaries. Validate native canvas, Playwright/browser OS dependencies, production build and start commands where applicable.
- All root runtime selectors are included in suc-dev service build filters. Merging to an auto-deployed branch can trigger a production deploy; leave this candidate unmerged pending authorization and completed compatibility checks. Preview automation is provider-controlled and was not verified.
- Rebuild native services to refresh their system CA store. Docker images require their own patched runtime and CA packages. No Dockerfile was identified in the primary repositories inspected. Check live service type before applying native instructions.
- After an authorized rollout, verify the runtime against the deploy ID/commit, normal health, and mocked/staging checkout/webhook flows. Do not run live purchases or replay production webhooks as a smoke test.

## Security evidence and keys

The Stripe notice reports possible outdated-runtime telemetry, not a confirmed intrusion or a specific service. No production server logs, Stripe request logs, account audit trail, or live runtime evidence were obtained. No conclusion of compromise or absence of compromise is warranted. Review unexpected requests, charges/payouts, account changes, and access patterns in the authorized production investigation. Stripe recommends rolling keys after securing/cleaning the environment, even without suspicious activity. Credential rotation is a separate authorized action; do not expose secret values, delete old keys prematurely, or rotate webhook signing secrets incidentally.

## Rollback

Record existing deploy IDs and settings before any rollout. Prefer reverting application changes while retaining patched Node. Rolling back an old deployment/image or this runtime change can restore a vulnerable runtime and old certificate trust. Retain original secret configuration; do not include secrets in evidence. No schema/data migration is required.

## Sources

- https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
- https://render.com/docs/node-version
- https://render.com/docs/advisory-emudhra
- https://docs.stripe.com/development/dashboard/request-logs
- https://docs.stripe.com/keys#rolling-keys

## Validation for suc-shared-data

Configuration JSON/YAML parsed; runtime selector consistency checked; dependency resolutions compared with upstream snapshot and unchanged. Full install/build/application testing remains required before deployment.
