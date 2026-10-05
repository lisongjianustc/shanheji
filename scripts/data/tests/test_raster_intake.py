import copy
import json
import sys
import unittest
from pathlib import Path
import numpy as np
from shapely.geometry import Point, shape
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from registration import Registration
from import_three_kingdoms_262 import extract as extract262
from import_china_572 import extract as extract572
ROOT = Path(__file__).resolve().parents[3]

class RegistrationTest(unittest.TestCase):
    def test_independent_points_do_not_influence_fit_and_bad_alignment_is_rejected(self):
        c=json.loads((ROOT/'data/registration/three-kingdoms-262.json').read_text())
        first=Registration(c['controls'])
        changed=copy.deepcopy(c['controls'])
        for p in changed:
            if p['role']=='check':p['pixel'][0]+=500
        with self.assertRaisesRegex(ValueError,'Held-out registration error'):
            Registration(changed)
        diagnostic=Registration(changed,max_check_km=1000)
        np.testing.assert_array_equal(first.affine,diagnostic.affine)

class RasterIntakeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.f262,cls.report262,cls.labels=extract262()
        cls.f572,cls.report572=extract572()

    def check_point(self,features,coordinates,owner):
        owners=[f['properties']['entityId'] for f in features if shape(f['geometry']).contains(Point(*coordinates))]
        self.assertEqual(owners,[] if owner is None else [owner])

    def test_262_legend_does_not_become_land_and_cities_belong_to_separate_polities(self):
        self.assertFalse(self.labels[1440:,3150:].any())
        self.assertFalse(self.labels[:4,:].any())
        self.assertFalse(self.labels[-4:,:].any())
        for coordinates in [[95,25],[94,36],[100,44],[115,43]]:
            self.check_point(self.f262,coordinates,None)
        self.check_point(self.f262,[104.06667,30.66667],'shu-han')
        self.check_point(self.f262,[116.39723,39.9075],'cao-wei')
        self.check_point(self.f262,[118.77778,32.06167],'sun-wu')
        self.check_point(self.f262,[125,25],None)
        self.assertLess(self.report262['registration']['maxCheckErrorKm'],25)

    def test_572_enclave_remains_distinct_and_neutral_islands_and_sea_are_excluded(self):
        config=json.loads((ROOT/'data/registration/china-572.json').read_text())
        reg=Registration(config['controls'],config['crs'],config['maxCheckErrorKm'])
        # Jiangling's star inside the source's small LIANG dashed outline.
        self.check_point(self.f572,reg.to_lonlat(917,566),'western-liang-nanbei')
        self.check_point(self.f572,[108.92861,34.25833],'northern-zhou')
        self.check_point(self.f572,[116.39723,39.9075],'northern-qi')
        self.check_point(self.f572,[113.25,23.11667],'chen')
        for point in [[110.3,19.2],[121,24],[120,39],[105.8,21]]:
            self.check_point(self.f572,point,None)
        self.assertLess(self.report572['registration']['maxCheckErrorKm'],30)

    def test_dated_polities_have_valid_nonoverlapping_geometry(self):
        for features,year in [(self.f262,262),(self.f572,572)]:
            for i,f in enumerate(features):
                g=shape(f['geometry']);self.assertTrue(g.is_valid);self.assertFalse(g.is_empty)
                self.assertEqual(f['properties']['snapshotYear'],year)
                self.assertEqual(f['properties']['spatialPrecision'],'disputed')
                for other in features[i+1:]:
                    self.assertLess(g.intersection(shape(other['geometry'])).area,1e-9)

if __name__=='__main__':unittest.main()
