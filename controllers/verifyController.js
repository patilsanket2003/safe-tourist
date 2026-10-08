const Tourist = require("../models/Tourist.js");
const { sha256Hex } = require("../utils/hash.js");
const { hex64ToBytes32 } = require("../utils/ethFormat.js");
const blockchain = require("../services/blockchainService.js");

// Verify a tourist’s record against blockchain
exports.verifyTouristRecord = async (req, res, next) => {
  try {
    const { touristId } = req.params; // coming from route: /api/verify/:touristId
    const t = await Tourist.findOne({ touristId });
    if (!t) return res.status(404).json({ error: "Tourist not found" });

    // Recompute payload hash deterministically (for diagnostics)
    const storedGovHash = t.govIdHash;
    const storedRegHash = t.audit?.regHash;
    const registeredAtIso = t.audit?.registeredAtIso;
    // Recompute using registration-time-compatible variants.
    // Older records may have been created when dayWiseItinerary was absent, which hashes JSON.stringify("").
    const itineraryHashFromCurrentValue = sha256Hex(JSON.stringify(t.dayWiseItinerary || ""));
    const itineraryHashLegacyEmptyString = sha256Hex(JSON.stringify(""));

    const itineraryVariants = t.audit?.dayWiseItineraryHash
      ? [
          {
            label: "audit.dayWiseItineraryHash",
            hash: t.audit.dayWiseItineraryHash,
            raw: "(used audit.dayWiseItineraryHash)",
          },
        ]
      : [
          {
            label: "current dayWiseItinerary",
            hash: itineraryHashFromCurrentValue,
            raw: JSON.stringify(t.dayWiseItinerary || ""),
          },
          {
            label: "legacy empty-string itinerary",
            hash: itineraryHashLegacyEmptyString,
            raw: JSON.stringify(""),
          },
        ];

    const normalize = (h) => (h ? (h.startsWith('0x') ? h.toLowerCase() : '0x' + h.toLowerCase()) : h);

    const payloadCandidates = itineraryVariants.map((variant) => {
      const payload = `${t.touristId}|${storedGovHash}|${variant.hash}|${registeredAtIso}`;
      const payloadHash = sha256Hex(payload);
      return {
        label: variant.label,
        itineraryRaw: variant.raw,
        itineraryHash: variant.hash,
        payload,
        payloadHash,
      };
    });

    const matchedCandidate = payloadCandidates.find(
      (candidate) => normalize(candidate.payloadHash) === normalize(storedRegHash),
    );

    const selectedCandidate = matchedCandidate || payloadCandidates[0];
    const itineraryHash = selectedCandidate.itineraryHash;
    const itineraryRaw = selectedCandidate.itineraryRaw;
    const payload = selectedCandidate.payload;
    const recomputedPayloadHash = selectedCandidate.payloadHash;

    // Debug logs to help diagnose verification mismatches
    console.log('verify: touristId=', t.touristId);
    console.log('verify: storedGovHash=', storedGovHash);
    console.log('verify: itineraryRaw=', itineraryRaw);
    console.log('verify: itineraryHash=', itineraryHash);
    // Canonical comparisons (normalize hex case and 0x)
    console.log('verify: payloadHash (normalized)=', normalize(recomputedPayloadHash));
    console.log('verify: db.regHash (normalized)=', normalize(storedRegHash));
    console.log('verify: equal to db?', normalize(recomputedPayloadHash) === normalize(storedRegHash));
    console.log('verify: selectedVariant=', selectedCandidate.label);
    if (!matchedCandidate && payloadCandidates.length > 1) {
      console.log('verify: candidate payload hashes=', payloadCandidates.map((c) => ({
        label: c.label,
        payloadHash: c.payloadHash,
      })));
    }
    console.log('verify: payload=', payload);
    console.log('verify: payloadHash=', recomputedPayloadHash);
    console.log('verify: db.regHash=', storedRegHash, ' db.eventId=', t.audit?.eventId, ' db.regTxHash=', t.audit?.regTxHash);
    try {
      console.log('verify: eventId32=', hex64ToBytes32(t.audit.eventId));
      const hashForBytes32 = storedRegHash || recomputedPayloadHash;
      console.log('verify: payloadHash32=', hex64ToBytes32(hashForBytes32));
    } catch (e) {
      console.error('verify: hex64ToBytes32 conversion error', e);
    }

    // Use eventId and payloadHash stored in DB
    if (!t.audit?.eventId) {
      return res.status(400).json({ error: "No blockchain eventId found for this tourist" });
    }

    const payloadHashToVerify = storedRegHash || recomputedPayloadHash;
    if (!payloadHashToVerify) {
      return res.status(400).json({ error: "No payload hash available for verification" });
    }

    let checkedContractAddress = blockchain.getConfiguredContractAddress();
    const contractAddressFromTx = t.audit?.regTxHash
      ? await blockchain.resolveContractAddressFromTx(t.audit.regTxHash)
      : null;

    let ok = await blockchain.verifyAuditRecord(
      hex64ToBytes32(t.audit.eventId),
      hex64ToBytes32(payloadHashToVerify)
    );

    // Fallback for records written to an older/different deployment.
    if (!ok && contractAddressFromTx) {
      const normalizedDefault = checkedContractAddress ? checkedContractAddress.toLowerCase() : null;
      const normalizedFromTx = contractAddressFromTx.toLowerCase();

      if (!normalizedDefault || normalizedDefault !== normalizedFromTx) {
        ok = await blockchain.verifyAuditRecordAt(
          contractAddressFromTx,
          hex64ToBytes32(t.audit.eventId),
          hex64ToBytes32(payloadHashToVerify)
        );
        checkedContractAddress = contractAddressFromTx;
      }
    }

    return res.json({
      verified: ok,
      touristId: t.touristId,
      payloadHashUsed: payloadHashToVerify,
      payloadHashRecomputed: recomputedPayloadHash,
      regHashInDb: storedRegHash,
      hashesMatchInDb: normalize(recomputedPayloadHash) === normalize(storedRegHash),
      recomputeVariantUsed: selectedCandidate.label,
      blockchain: {
        eventId: t.audit.eventId,
        regTxHash: t.audit.regTxHash,
        contractAddressChecked: checkedContractAddress,
        contractAddressFromTx,
      },
    });
  } catch (err) {
    console.error("❌ verifyTouristRecord error:", err);
    next(err);
  }
};
