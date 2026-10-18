# QDeclare

QDeclare is a post quantum integrity layer for the asset and interest declarations of public officials. It seals each declaration when it is filed, links it to the previous declaration of the same official and keeps every correction as a new sealed version, so ethics bodies, anti corruption agencies and courts can later prove what an official declared, and when, year by year. Every record is signed with the Module Lattice Digital Signature Algorithm, parameter set 65, as standardised in FIPS 204, and can carry a Qstamp time proof recorded on the Quantova network under the QDeclare record kind.

QDeclare is part of QGov, the government branch of the Qstamp family.

## What QDeclare is

Asset and interest declarations are one of the principal tools against illicit enrichment and conflicts of interest. Their value depends entirely on being able to prove what an official declared and when. A declaration quietly edited once an inquiry begins, a late filing dated earlier, or a history kept only as its latest version defeats that purpose.

QDeclare removes that possibility. The ethics body registers each declarant and the office and legal basis of the duty. The official files each declaration under their own key, naming the previous declaration of the same registration, so the declarations of each official form an unbroken series. A correction is a new declaration that names the version it corrects and states the reason, and the original is never overwritten. The ethics body seals its acknowledgement of each filing with the legal deadline, and a reviewing officer seals each review.

QDeclare is standalone. It runs on the systems of its users, holds keys locally and uses the Quantova network only as a neutral public ledger for time proofs.

## What it detects

1. A declaration edited, replaced or backdated after it was filed.
2. A declaration filed by a key other than the official named in the registration.
3. A gap in the series of an official's declarations, or two different declarations in the same position.
4. A correction that does not name an earlier declaration of the same period in the same series or states no reason, or a second declaration for a period that is not marked as a correction.
5. The filing time relative to the deadline stated by the ethics body, reported as a notice when the acknowledgement is verified, without changing its result.
6. A record signed by a key that is not trusted for its role, or two linked records signed by the same key.

## Who uses it

1. Ethics bodies and anti corruption agencies that receive declarations of assets, income, interests and gifts.
2. Parliaments and public bodies that keep registers of interests.
3. Investigators and courts that rely on declarations as evidence.

## How an ethics body integrates QDeclare

1. Issue keys by role. The ethics body, each declaring official and reviewing officers hold separate ML-DSA-65 keys. The verifier is given one list of trusted keys for each role, ethics body key, declarant key and reviewing officer key. A key may appear in only one list, and QDeclare refuses to sign a record with the key that signed a record it relies on.

2. Register declarants. The ethics body calls registration with the key of the official, the office and the legal basis of the duty.

3. File declarations. The official calls declaration against the registration with the period and the declaration document, naming the previous declaration of the registration or declaring it the first.

4. Correct by new version. A correction is filed with declaration naming the version it corrects in corrects and the reason, as the next declaration of the series.

5. Acknowledge and review. The ethics body calls acknowledgement with the legal deadline, and a reviewing officer calls review with the fingerprint of the review outcome.

6. Anchor promptly. A single service with a funded Quantova account anchors new records in batches under the QDeclare record kind, and each record receives its own receipt.

7. Verify on demand. Auditors and courts verify any record against the lists of trusted keys and the records held, with the verify command, the library or the independent procedure below.

## What is published and what stays private

Declarations and the personal data of officials and their families stay with the ethics body. Records hold only fingerprints of declaration documents and the key identifiers of officials. Where the law makes part of a declaration public, the published version can be shown to match the sealed one.

When a record is anchored, only a 32 byte Qstamp commitment reaches the chain. It is derived from a salted fingerprint of the signed record and cannot be reversed into any field of the record.

## Cryptographic construction

1. Keys. Keys are 32 byte seeds from which ML-DSA-65 key pairs are derived by the key generation procedure of FIPS 204. A key identifier is the SHA3 hash with a 256 bit output of the ASCII label quantova/qdeclare/key/1, the byte 0x00 and the 1952 byte public key.

2. Party commitments. Each party identifier is first made canonical. It is brought to Unicode normal form KC, spaces, punctuation and invisible characters are removed, case is folded, and every character is replaced by its prototype in the confusable skeleton of Unicode Technical Standard 39, version 18.0.0, first in upper case and then in lower case, until the result no longer changes. An identifier that holds an unassigned character, or no letter or digit, is refused. A party is then named by the SHA3-256 hash of the ASCII label quantova/qdeclare/party/2, the byte 0x00, a 32 byte salt and the canonical identifier in UTF-8, so the same identifier written with other case, spacing, separators or lookalike letters gives the same commitment. The salt is random or reused from an earlier commitment, or, when the authority supplies its own 32 byte secret and the reference of the record that defines the series, it is the SHA3-256 hash of the ASCII label quantova/qdeclare/party-salt/2, the byte 0x00, the secret, the 32 byte reference and the canonical identifier, so the same party always receives the same commitment in that series. A commitment made by an earlier release from the identifier in Unicode normal form C under the label quantova/qdeclare/party/1 is still accepted when an identity and salt are checked against it.

3. Statements. Each statement is a canonical binary encoding that begins with the ASCII bytes QDCL and the version byte 1, followed by the statement type and its fields in a fixed order. Every field is an unsigned 16 bit big endian length followed by its bytes. Identifiers, key identifiers, references and digests are encoded as raw bytes, an absent reference is an empty field, sequence numbers and sizes are unsigned 64 bit big endian integers, and text is UTF-8 in Unicode normal form C, so every statement has exactly one encoding. Amounts are whole numbers of minor units with no leading zeros, and a currency is three capital letters, which QDeclare checks for form only, so the integrating system should use ISO 4217 codes.

4. Signatures. Statements are signed with ML-DSA-65 in its hedged form under the FIPS 204 context string quantova/qdeclare/1, which separates QDeclare signatures from every other SDK of the family and from every other use of the algorithm.

5. References. A record is referenced by the SHA3 hash of the label quantova/qdeclare/ref/1, the byte 0x00, the encoded statement and its signature. Each record names the records it relies on by these references, so it relies on one exact signed record that existed before it was signed.

6. Series. The declarations of one registration form a series. Every record of a series carries its position from one and the reference of the previous record of the series, which is empty only for the first.

7. Anchor. To anchor a record, QDeclare stamps the SHA3 hash of the label quantova/qdeclare/anchor/1, the byte 0x00, the encoded statement and its signature as a Qstamp record of kind 1104.

## Record types

| Type | Signed by | Relies on | Series |
|---|---|---|---|
| registration | ethics body key | none | none |
| declaration | declarant key | registration | per registration |
| acknowledgement | ethics body key | declaration | none |
| review | reviewing officer key | declaration | none |

## Rules applied by verification

1. The expected record type is required, so a record of one type can never be presented as another, and options that do not apply to that type are refused.
2. The record is well formed and signed by the key it names, and that key is trusted for the role of its type. The lists of trusted keys must not share a key.
3. Every record the record relies on, and every earlier record of each series involved, is taken from the records supplied and verified in turn by the same rules.
4. Each linked record is exactly the one referenced, of the expected type, signed by a different key, and dated no later than the record that relies on it.
5. Copied and matched fields agree with the records they come from, and limits taken from linked records are respected.
6. Each record of a series continues the previous record in position and currency, and any limit on the series is respected.
7. Any two different supplied records in the same position of a series involved make the result invalid.
8. A record that depends on a series is valid only when the verifier declares that every record it holds for the series involved was supplied. Without that declaration the result is indeterminate, and with it a missing record makes the result invalid.
9. A declaration is signed by the official named in its registration.
10. A correction names an earlier declaration of the same period in its own series and states the reason, and only a correction names a corrected version. A declaration for a period that an earlier declaration of the series already covers must be a correction. Periods are compared once made canonical as described for party identifiers, so FY-2025 and fy 2025 are the same period.
11. An acknowledgement reports whether the declaration was filed by the deadline it states, taking the later of the stated filing time and the earliest anchor of the declaration that verifies. A late filing, or a declaration that is not anchored and so is not proven to have been filed in time, is reported only as a notice in the result. Neither makes the acknowledgement invalid or indeterminate, because the acknowledgement itself is genuine. The result also carries facts.onTime, which is true when filing by the deadline is proven, false when the declaration was filed late and null when filing in time is only claimed, so a verifier that enforces a filing deadline must require facts.onTime to be true.
12. When documents are supplied, their fingerprints match the signed fingerprints, and when a party identity and salt are supplied, they match the commitment.
13. Each anchor is verified under the QDeclare record kind with a SHA3 digest, and the stated time is not later than the anchor time, allowing five minutes. An anchor more than twenty four hours after the stated time, unless another limit is given, or later than a given verification time, does not prove the stated time and makes the result indeterminate. When different anchors of one record are supplied, anchors that do not commit to the record are set aside, the others are taken in order of anchor time, chain, height, transaction and position in the batch, and the earliest that verifies is used, so a later anchor added by anyone cannot displace an earlier one. At most eight anchors of one record are read from the chain, and when none of the earliest eight verifies while more were supplied the result is indeterminate. Each anchoring transaction is read once per verification, at most 20000 of them unless maxAnchorLookups gives another bound, and a record whose anchor was not read within that bound is indeterminate. The time of verification is read from the chain unless it is given with at, and when it cannot be read verification stops with an error rather than use the local clock.

A result is valid only when the trusted keys are given, every record relied on is supplied, the records held for each series are declared complete where a series is involved, and every record carries a proven anchor. When any of these is missing the result is indeterminate rather than valid. A record verified with anchoring not required proves only who signed it and what was signed, and its stated time is the claim of its signer.

## Trust model of this release

This release anchors on the live Quantova network Q-test-net-1. The signing module is compiled from the Quantova Q-Crypto library, which follows FIPS 204 and FIPS 202 and has been tested against the NIST vectors. It has not been validated under FIPS 140-3. An anchor time is accepted only when Qstamp proves the anchor, either by a finality certificate checked against a pinned validator roster or by official endpoints of the network run by two different operators. An anchor confirmed by endpoints of one operator, or by endpoints chosen by the verifier, is unproven. An unproven anchor is treated as not anchored and makes the result indeterminate, never valid, whatever options are set. While the network has one official endpoint and no pinned roster every anchor is unproven, which is the honest result. Verification names the endpoints it consulted and says whether they are the official endpoints of the network.

A sealed record proves who signed it, what was signed and when it was anchored. Each check is made from the records a verifier is given, so two records in the same position of a series are detected only when both are supplied, and auditors should obtain every record held for the series they examine. A party commitment is the same in every record that uses the same salt, so records about one party can be linked by anyone who sees them, and anyone who obtains the salt can test guesses of the identifier, so salts must be protected like the identifiers themselves. Verifiers must keep the keys of retired officials in the trusted lists for as long as records they signed are verified. A sealed record does not establish that a declaration is complete or truthful, which remains the work of the ethics body, investigators and the courts. The deadline in an acknowledgement is stated by the ethics body, and registering one official more than once creates separate series, so the ethics body should keep one registration per official and office. No anchor proves that a record was not made before the time it states, so a stated time is proven only as a latest time.

## Installation

```
npm install @quantovainc/qdeclare
```

QDeclare requires Node 20 or later.

## Command line use

```
qdeclare keygen ethics.key
qdeclare keygen official.key
qdeclare keygen reviewer.key
qdeclare key ethics.key > ethics.pub.json
qdeclare key official.key > official.pub.json
qdeclare key reviewer.key > reviewer.pub.json

qdeclare registration --key ethics.key --declarant-key-id official.pub.json --office "Minister of Finance" --legal-basis "Public Officials Act section 12" --out registration.json
qdeclare declaration --key official.key --registration registration.json --period 2026 --content declaration.pdf --first --out declaration.json
qdeclare acknowledgement --key ethics.key --declaration declaration.json --deadline 2026-12-31T23:59:59.000Z --out acknowledgement.json
qdeclare anchor registration.json declaration.json acknowledgement.json --seed-file account.key

qdeclare verify declaration.json --type declaration --ethics ethics.pub.json --declarant official.pub.json --reviewer reviewer.pub.json --record registration.json --content declaration.pdf --all-supplied
```

The file account.key holds the 32 byte seed of a funded Quantova account, as 64 hexadecimal characters, which pays for anchoring. It is separate from the signing keys of officials.

If anchoring is interrupted after its transaction may have been sent, a pending stamp is kept beside each envelope and the envelopes are not anchored again. Finish with qdeclare complete, giving the same envelopes in the same order and the pending stamp.

The command exits with status 0 when the result is valid, 1 when it is invalid, refused or the evidence is malformed, 2 when it cannot be decided, and 64 for usage errors. Key and salt files must be readable only by their owner and are never followed through symbolic links.

## Independent verification procedure

1. Decode each public key and signature from base64 and confirm their lengths are 1952 and 3309 bytes.
2. Compute each key identifier from the label quantova/qdeclare/key/1, the byte 0x00 and the public key, and compare it with the signer identifier and the signing party named in the statement.
3. Encode each statement as described above and verify its signature with ML-DSA-65 under the context string quantova/qdeclare/1, following FIPS 204.
4. Compute the reference of each linked record and of each earlier record of each series, confirm each is the one named, and apply the rules of verification listed above.
5. Compute the anchor value of each record and verify its receipt by the procedure published with Qstamp under record kind 1104.

## Network

The live Quantova network is named Q-test-net-1 with genesis hash ca91e093bb8de33e90db52d7c89876597d14760703793ea7211929e73e613062. Anchors are recorded by the official Qstamp contract on that network. The public endpoint is https://rpc-testnet.quantova.org. By default verification consults the official endpoints of the network. Endpoints chosen by the verifier are given with the rpc or clients option, or with --rpc once for each on the command line, and verification consults them only with trustCustomEndpoints, or --trust-custom-endpoints. An endpoint on a loopback address is refused unless allowLoopback, or --allow-loopback, is set, and an endpoint on a private network address unless it is named in endpointAllowList, or with --allow-endpoint. The option expectedSender, or --expect-sender, names the Quantova accounts entitled to anchor records, and an anchor signed by any other account is invalid. Anchoring accepts chain data only when at least two endpoints run by different operators agree, and the option trustSingleEndpoint, or --trust-single-endpoint, relies on one endpoint for anchoring and for the time of the chain.

## Licence

QDeclare is created and owned by Quantova Inc. It is licensed under the Apache License 2.0 or the MIT licence, at your option. The full texts are in the files LICENSE-APACHE and LICENSE-MIT, and the notice is in NOTICE.
