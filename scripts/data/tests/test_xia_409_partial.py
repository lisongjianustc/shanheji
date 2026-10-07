import sys
import unittest
from pathlib import Path
from shapely.geometry import shape, Point
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from import_xia_409_partial import extract


class Xia409PartialTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.feature, cls.report, cls.parts = extract()

    def test_unsupported_links_are_omitted_from_fill_and_border(self):
        self.assertEqual([j['status'] for j in self.report['junctions']],
                         ['omitted', 'reviewed-short-junction', 'omitted'])
        self.assertLess(self.parts['pixels'].intersection(self.parts['mask']).area, 1e-8)
        self.assertLess(self.parts['border'].intersection(self.parts['mask'].buffer(.005)).length, 1e-8)
        self.assertGreater(self.report['omittedAreaPx2'], 600)
        self.assertLess(self.report['omittedAreaPx2'], 650)
        for j in self.report['junctions']:
            if j['status'] == 'reviewed-short-junction':
                self.assertLessEqual(j['gapPx'], 3)

    def test_label_identity_and_other_polities_are_kept_separate(self):
        self.assertTrue(self.parts['pixels'].contains(Point(650, 350)))
        for xy in [(1000, 350), (250, 400), (650, 700)]:
            self.assertFalse(self.parts['pixels'].contains(Point(*xy)))
        self.assertEqual(self.report['sourceLabel'], 'Xia')

    def test_partial_geometry_and_display_border_are_valid(self):
        p = self.feature['properties']
        geometry = shape(self.feature['geometry'])
        border = shape(p['compilation']['boundaryGeometry'])
        self.assertTrue(geometry.is_valid)
        self.assertEqual(p['compilation']['extent'], 'partial-source')
        self.assertLess(border.difference(geometry.boundary.buffer(.000001)).length, 1e-8)
        self.assertLess(border.length, geometry.boundary.length)
        self.assertEqual(len(self.report['checks']), 4)

    def test_source_is_only_409_and_remains_disputed(self):
        p = self.feature['properties']
        self.assertEqual(p['entityId'], 'xia')
        self.assertEqual(p['snapshotYear'], 409)
        self.assertEqual(p['temporalSupport'], 'snapshot')
        self.assertEqual(p['validity']['endExclusive']['latest'], '0410-01-01')
        self.assertEqual(p['spatialPrecision'], 'disputed')
        self.assertIn('非全年实控', p['validity']['label'])


if __name__ == '__main__':
    unittest.main()
