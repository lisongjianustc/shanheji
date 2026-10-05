"""Auditable map registration. Held-out points never enter the affine fit."""
import numpy as np
from pyproj import Transformer, Geod


class Registration:
    def __init__(self, controls, crs="EPSG:3857", max_check_km=25):
        self.forward = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
        self.inverse = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
        fits = [p for p in controls if p["role"] == "fit"]
        checks = [p for p in controls if p["role"] == "check"]
        if len(fits) < 4 or len(checks) < 2:
            raise ValueError("Registration needs distributed controls and independent check points")
        xy = np.array([self.forward.transform(*p["coordinates"]) for p in fits])
        matrix = np.column_stack([xy, np.ones(len(fits))])
        self.affine, _, rank, _ = np.linalg.lstsq(matrix, [p["pixel"] for p in fits], rcond=None)
        if rank != 3:
            raise ValueError("Registration controls are collinear")
        self.inverse_affine = np.linalg.inv(self.affine[:2])
        geod = Geod(ellps="WGS84")
        self.residuals = []
        for p in controls:
            lon, lat = self.to_lonlat(*p["pixel"])
            _, _, meters = geod.inv(*p["coordinates"], lon, lat)
            projected = self.forward.transform(*p["coordinates"])
            predicted = np.array([*projected, 1]) @ self.affine
            self.residuals.append({"label": p["label"], "role": p["role"],
                                   "errorPixels": float(np.linalg.norm(predicted-p["pixel"])),
                                   "errorKm": float(meters/1000)})
        self.max_check_km = max(p["errorKm"] for p in self.residuals if p["role"] == "check")
        if self.max_check_km > max_check_km:
            raise ValueError(f"Held-out registration error {self.max_check_km:.2f} km exceeds gate {max_check_km}")

    def to_lonlat(self, x, y, z=None):
        pixels = np.stack([x, y], axis=-1)
        xy = (pixels-self.affine[2]) @ self.inverse_affine
        return self.inverse.transform(xy[..., 0], xy[..., 1])

    def report(self):
        return {"affine": self.affine.tolist(), "residuals": self.residuals,
                "maxCheckErrorKm": self.max_check_km,
                "accuracyMeaning": "配准残差包括古今城址移动，不是历史疆界精度，也不是全图误差上限"}
