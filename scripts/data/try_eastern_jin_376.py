"""Reproduce the 376 candidate's diagnostics; never publish a boundary.

Modern background extrema are tentative identifications. A small residual
does not approve these controls, identify the original projection, or establish
historical control. Fit/check roles and the 50 km gate remain in the audit.
"""
import hashlib
import json
from pathlib import Path
from registration import Registration

ROOT = Path(__file__).resolve().parents[2]

if __name__ == "__main__":
    audit = json.loads((ROOT / "data/audits/eastern-jin-376-registration-trial.json").read_text())
    raw = ROOT / "data/raw/eastern-jin-376.png"
    if hashlib.sha256(raw.read_bytes()).hexdigest() != audit["sourceSha256"]:
        raise ValueError("Source revision changed; controls need review")
    results = []
    for model in audit["models"]:
        # Collect failed models too; apply the unchanged gate explicitly below.
        reg = Registration(audit["controls"], model["crs"], max_check_km=float("inf"))
        results.append({"crs": model["crs"], **reg.report(),
                        "passesNumericalGate": reg.max_check_km <= audit["acceptanceGateKm"]})
    print(json.dumps({"decision": audit["decision"], "geometryPublished": False,
                      "acceptanceGateKm": audit["acceptanceGateKm"],
                      "models": results}, ensure_ascii=False, indent=2))
