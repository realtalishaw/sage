# Provisioning API Notes

Date:
- March 12, 2026

Scope:
- `POST /instances` on `apps/provisioning-service`
- `GET /instances/:instanceRef` on `apps/provisioning-service`
- `DELETE /instances/:instanceRef` on `apps/provisioning-service`
- create droplet
- upload wrapper/OpenClaw/bootstrap payload
- upload secret env file from `.secrets/.env`
- bootstrap OpenClaw and wrapper on the droplet
- return the droplet public IP only after:
  - wrapper health is live
  - OpenClaw health is live
  - wrapper chat proxy returns a real streamed response

## Current working API shape

Request:

```json
{
  "name": "sage-api-20260312-121835",
  "region": "nyc1"
}
```

Response:

```json
{
  "createdAt": "2026-03-12T16:18:59.098Z",
  "image": "ubuntu-24-04-x64",
  "instanceId": "557793014",
  "ipAddress": "143.198.162.130",
  "name": "sage-api-20260312-121835",
  "region": "nyc1",
  "size": "s-4vcpu-8gb",
  "status": "created"
}
```

Destroy response:

```json
{
  "deletedAt": "2026-03-12T16:29:29.886Z",
  "instanceId": "557794845",
  "name": "sage-destroy-test-20260312-122829",
  "status": "deleted"
}
```

Lookup response:

```json
{
  "image": "ubuntu-24-04-x64",
  "instanceId": "557793014",
  "ipAddress": "143.198.162.130",
  "name": "sage-api-20260312-121835",
  "region": "nyc1",
  "size": "s-4vcpu-8gb",
  "status": "active"
}
```

## What failed before the successful run

1. OpenClaw token mismatch
- The uploaded env file had generated gateway tokens.
- The bootstrap script wrote `openclaw.json` before loading that env file.
- Result: wrapper `api/chat` got `401` from OpenClaw.

Fix:
- source `/etc/sage/openclaw.env` before running `setup-openclaw-instance-config.sh`

2. First-boot apt lock race
- Fresh droplets can still be running provider/Ubuntu package setup when SSH first opens.
- Our bootstrap hit the apt lock and exited.

Fix:
- wait for `apt`, `apt-get`, or `dpkg` processes to clear before package operations

## Successful end-to-end verification

Successful API-created droplet:
- name: `sage-api-20260312-121835`
- id: `557793014`
- public ip: `143.198.162.130`

Verified:
- `GET http://143.198.162.130/api/health`
- `POST http://143.198.162.130/api/chat`
- live streamed response returned through wrapper from OpenClaw
- `GET /instances/:instanceRef` returned the live DigitalOcean status for the API-created droplet
- `DELETE /instances/:instanceRef` successfully removed a disposable DigitalOcean droplet

## Follow-up improvements

- move remote bootstrap into a dedicated deployment helper module instead of keeping it all in one server file
- add droplet cleanup on failed provisioning attempts
- persist deployment status and logs so the API can return richer progress than a single blocking request
- consider switching OpenClaw startup away from `gateway:dev` for faster cold starts
