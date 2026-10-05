import unittest, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from import_sui_610 import extract_features, load_registration, source_geometries
from shapely.geometry import shape, Point
from svg_paths import svg_polygon

class SuiIntakeTest(unittest.TestCase):
    def test_cubic_parser_is_explicit_and_rejects_open_or_unsupported_paths(self):
        g=svg_polygon('M0,0 L10,0 C10,5 5,10 0,10 z')
        self.assertTrue(g.contains(Point(5,5)))
        self.assertFalse(g.contains(Point(9,9)))
        for path in ('M0,0 l10,0 L0,10z','M0,0 Q10,0 10,10 z','M0,0 L10,0 L0,10'):
            with self.assertRaises(ValueError):svg_polygon(path)

    def test_clear_extent_excludes_west_and_artificial_edges(self):
        f = extract_features()[0]
        g = shape(f['geometry'])
        border = shape(f['properties']['compilation']['boundaryGeometry'])
        base, extent = source_geometries()
        reg = load_registration()
        # All outline segments originate in the source, none close its cropped extent.
        self.assertTrue(g.is_valid and not g.is_empty)
        self.assertTrue(border.is_valid and not border.is_empty)
        for coordinate in [(108.92861,34.25833),(112.43684,34.67345),(118.77778,32.06167)]:
            self.assertTrue(g.contains(Point(coordinate)))
        for coordinate in [(94.68333,40.16667),(121,24),(125,25),(120.2054,31.2061)]:
            self.assertFalse(g.contains(Point(coordinate)))
        self.assertEqual(f['properties']['snapshotYear'],610)
        self.assertEqual(f['properties']['compilation']['extent'],'partial-source')
        self.assertEqual(f['properties']['relation'],'administration')
        # Synthetic clipping edges have positive length and are omitted from the outline.
        clipped=base.intersection(extent)
        self.assertGreater(clipped.boundary.difference(base.boundary.buffer(.01)).length,10)
        self.assertGreater(g.boundary.difference(border.buffer(.0001)).length,.1)
        self.assertLessEqual(reg.max_check_km,50)
        # Publishing must reject a detached line, rather than paint a fabricated boundary.
        import subprocess, json
        f['properties']['compilation']['boundaryGeometry']['coordinates']=[[[150,50],[151,51]]]
        result=subprocess.run([sys.executable,str(Path(__file__).resolve().parents[1]/'geometry_check.py')],input=json.dumps({'features':[f]}),text=True,capture_output=True)
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Source border must follow',result.stdout)

if __name__=='__main__': unittest.main()
