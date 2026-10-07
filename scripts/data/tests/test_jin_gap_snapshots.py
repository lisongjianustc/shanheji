import sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from import_jin_gap_snapshots import extract
from shapely.geometry import shape, Point

class JinGapSnapshotsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.features, cls.report = extract()
        cls.by = {f['properties']['entityId']:f for f in cls.features}

    def test_four_specific_years_and_source_uncertainty(self):
        self.assertEqual([(f['properties']['entityId'],f['properties']['snapshotYear']) for f in self.features],
            [('jin',280),('han-zhao',327),('later-zhao',327),('northern-yan',409)])
        for f in self.features:
            p=f['properties'];year=p['snapshotYear']
            self.assertEqual(p['temporalSupport'],'snapshot')
            self.assertEqual(p['validity']['endExclusive']['latest'],f'{year+1:04d}-01-01')
            self.assertEqual(p['spatialPrecision'],'disputed')
            self.assertIn('非全年实控',p['validity']['label'])
            self.assertTrue(shape(f['geometry']).is_valid)
        self.assertIn('约280',self.by['jin']['properties']['validity']['label'])
        self.assertIn('约327',self.by['han-zhao']['properties']['validity']['label'])
        self.assertEqual(len(self.report['checks']),4)
        self.assertLess(self.report['maxCheckErrorKm'],50)

    def test_western_jin_is_partial_and_never_assigns_offshore_islands(self):
        f=self.by['jin'];g=shape(f['geometry']);border=shape(f['properties']['compilation']['boundaryGeometry'])
        self.assertEqual(f['properties']['compilation']['extent'],'partial-source')
        self.assertTrue(g.contains(Point(112.43684,34.67345))) # Luoyang regional check
        self.assertTrue(g.contains(Point(113.2644,23.1291))) # Pearl River regional check
        self.assertFalse(g.contains(Point(121,24))) # Source Taiwan is unassigned
        self.assertFalse(g.contains(Point(110,41.5))) # Outside source northern border
        west=g.bounds[0]
        self.assertFalse(any(abs(a[0]-west)<1e-6 and abs(b[0]-west)<1e-6 for line in border.geoms for a,b in zip(line.coords,list(line.coords)[1:])))
        self.assertLess(border.difference(g.boundary.buffer(.00005)).length,.0001)

    def test_closed_source_contours_do_not_overlap_or_use_frame_closures(self):
        a,b=shape(self.by['han-zhao']['geometry']),shape(self.by['later-zhao']['geometry'])
        self.assertLess(a.intersection(b).area,.00001)
        self.assertTrue(a.contains(Point(108.94,34.34))) # Chang'an regional check
        self.assertTrue(b.contains(Point(114.5,37.0))) # Xiangguo regional check
        for r in self.report['records'][1:]:
            self.assertEqual(r['frameBoundaryLengthPx'],0)
            self.assertFalse(r['partial'])
            self.assertLessEqual(max(r['junctionGapsPx']),3)

    def test_unresolved_western_qin_is_not_published(self):
        self.assertNotIn('western-qin',self.by)
        deferred=next(r for r in self.report['deferred'] if r['entityId']=='western-qin')
        self.assertEqual(deferred['year'],409)
        self.assertIn('归属',deferred['reason'])

if __name__=='__main__':unittest.main()
