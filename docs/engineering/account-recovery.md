# Password recovery and season reset

Password recovery is required in v1 (D-18): forgetting passwords caused a
problem in the previous season. This document proposes an organiser-assisted
flow without introducing email accounts or an email delivery service.

## 1. Participant and organiser journey

1. At a protected name's password prompt, “Forgot your password?” shows the
   configured organiser contact instructions. The person uses the family's
   existing private channel; the application does not message anyone for them.
2. The organiser verifies who is asking, opens that participant's recovery
   action, and confirms their own organiser password. The organiser never
   sees the participant's old password or assignment.
3. The server creates a single-use recovery link. The organiser copies it and
   shares it privately with that person, not in the group chat. This is the
   only point at which the raw token is displayed. Reissuing replaces it.
4. The participant opens a plain accessible HTML recovery form, enters a new
   password twice, and submits. No 3D scene must load to recover access.
5. On success, all old participant sessions and recovery links are invalidated.
   The participant signs in normally with their new password. Their recipient,
   fixed ornaments, wishes and claims are unchanged.

Generating a link leaves the current password and sessions valid until a
successful redemption; an expired or lost link cannot lock the person out.
A protected name remains protected throughout recovery. Full season reset is
separate and intentionally makes names unprotected again.

This mechanism trusts the organiser: someone able to issue a link could redeem
it themselves. Normal organiser APIs still cannot view assignments or obtain
participant sessions directly. Do not claim secrecy from a malicious recovery
operator; preserve secrecy from other participants and routine admin browsing.

## 2. Token and HTTP contract

`POST /organiser/participants/:id/recovery` requires organiser session, CSRF,
current season ID, an enrolled participant and recent password confirmation
(default within five minutes). Generate 32 random bytes, URL-safe encode them,
and store only the token hash bound to participant, season and credential
generation. Default expiry is 30 minutes. Both lifetimes are configurable.
Rate-limit issuance (default five per participant/hour and twenty per organiser/
hour); return no participant exchange content.

Build the URL from the configured public origin, never the request Host header.
Proposed route: `/recover#token=...`. The fragment keeps the token out of ordinary
server access logs; the client immediately removes it with history replacement
and holds it only in memory. Do not put it in storage, analytics, referrers or
error reports. A reloaded form can ask the person to reopen their private link.
Use HTTPS, no-store, no-referrer and no third-party resources on this route.

`POST /auth/recover` submits the token and new password through a same-origin
JSON request. The server locates the token by hash; the caller cannot choose
another participant or season. Use the same password policy/hash as enrolment.
Invalid, expired, replaced, used or old-season tokens return a generic
`RECOVERY_INVALID` message and instructions to request a new link. Limit token
attempts per IP and bounded hash work; do not lock an account merely because
anonymous recovery attempts occurred.

Hash the proposed password outside the transaction with bounded CPU/memory,
then acquire season and participant/token locks in the standard order. Recheck
current season, token hash, expiry, generation and unused state under those
locks. Atomically replace the password, increment credential generation,
consume/invalidate all that person's recovery tokens, and revoke their sessions.
Exactly one concurrent redemption succeeds. No assignment/wish/claim rows or
slot mappings are changed. Close their SSE connections after commit.

Do not auto-login or reveal assignment data from recovery. If its success
response is lost, the user can try normal login with the new password; retrying
a consumed token returns the generic invalid result. Link issuance is rotational,
not a mutation receipt storing a raw token: on a lost issuance response, the
organiser explicitly issues a replacement. Keep minimal restricted audit facts
(actor, participant, time, issued/redeemed outcome), never token/password/assignment.
Remove recovery records and their seasonal audit metadata on season reset.

These choices follow the token, expiry, side-channel and session principles in
[OWASP's recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html),
adapted to manually verified family identity. No security-question or public
“clear this password” endpoint.

## 3. Full season reset

After explicit destructive confirmation, lock the current season and clear
assignments, slots, wishes, claims, previews and seasonal receipts; delete
recovery tokens; null every participant password hash and advance credential
generations; revoke all participant sessions and close their streams. Retain
roster and exclusions, create the next setup season, retain separate organiser
credentials, and keep the minimal reset-idempotency receipt.

Names become claimable after the organiser reopens the season. Old cookies,
recovery links, pending picks and mutation receipts cannot authenticate or act
in the new season. Two concurrent enrolments of the same newly unprotected
name still have one winner. An in-flight old password login must recheck the
credential generation/season before issuing a session, including if recovery
or reset occurred while password verification was running.

For a forgotten organiser password, the trusted server operator replaces the
configured organiser hash/secret using the documented local tooling, redeploys,
and invalidates old organiser sessions. This does not clear the family season.
Keep that operational path separate from participant recovery and season reset.

## 4. Acceptance

Cover issue/reissue, expiration, used/invalid token, mismatched season,
concurrent redemption, recovery-vs-reset, old-login-vs-recovery, and lost
responses. Assert the recipient, concealed slots, wishes and claims are unchanged
by recovery; all old sessions/streams are revoked on completion. Assert all names
become unprotected after full reset and can enrol after reopening. Verify the
organiser cannot read assignment data and that tokens never enter logs, persistent
browser storage, generic mutation receipts or third-party requests. Exercise
both languages, keyboard, password managers and mobile link opening.
