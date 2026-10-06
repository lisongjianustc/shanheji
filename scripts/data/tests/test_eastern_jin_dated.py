import sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from import_eastern_jin_dated import extract
from svg_paths import svg_polyline
from shapely.geometry import shape, Point

class EasternJinDatedTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.features, cls.report = extract()

    def test_source_projection_checks_and_all_years(self):
        self.assertEqual([f['properties']['snapshotYear'] for f in self.features],[327,383,409])
        self.assertEqual(len(self.report['checks']),4)
        self.assertLess(self.report['maxCheckErrorKm'],self.report['registrationGateKm'])
        self.assertEqual(self.report['registrationMethod'],'source-declared projection and identified crop; no fitted parameters')

    def test_partial_frame_closure_is_not_a_border(self):
        for f in self.features:
            g=shape(f['geometry']); border=shape(f['properties']['compilation']['boundaryGeometry'])
            self.assertTrue(g.is_valid)
            self.assertEqual(f['properties']['compilation']['extent'],'partial-source')
            self.assertFalse(g.contains(Point(113,23)))
            bottom=g.bounds[1]
            self.assertFalse(any(abs(a[1]-bottom)<1e-6 and abs(b[1]-bottom)<1e-6 for line in border.geoms for a,b in zip(line.coords,list(line.coords)[1:])))
            self.assertLess(border.difference(g.boundary.buffer(.00005)).length,.0001)

    def test_before_fei_only_no_counterattack_undated_line(self):
        record=next(r for r in self.report['records'] if r['year']==383)
        self.assertEqual(record['excludedPathIds'],['path2987-7'])
        feature=next(f for f in self.features if f['properties']['snapshotYear']==383)
        self.assertIn('战前',feature['properties']['validity']['label'])
        self.assertEqual(feature['properties']['validity']['endExclusive']['latest'],'0384-01-01')
        self.assertEqual(feature['properties']['relation'],'reconstruction')

    def test_open_svg_strokes_are_never_implicitly_closed(self):
        line=svg_polyline('m 1,2 3,0 c 0,2 2,2 2,0')
        self.assertEqual(list(line.coords)[0],(1,2))
        self.assertEqual(list(line.coords)[-1],(6,2))
        self.assertFalse(line.is_ring)
        for path in ['M0 0 L1 1 Z','M0 0 H10','M0 0 M1 1']:
            with self.assertRaises(ValueError): svg_polyline(path)

if __name__=='__main__': unittest.main()
