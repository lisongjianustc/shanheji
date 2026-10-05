import unittest,sys,json,subprocess
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from svg_paths import svg_polygon_relative
from import_tang_742 import extract,load_registration
from shapely.geometry import Point,shape


class Tang742Test(unittest.TestCase):
    def test_relative_parser_preserves_cubic_and_close_cursor(self):
        g=svg_polygon_relative('m10 10 10 0 c0 5 -5 10 -10 10 z m30 0 10 0 0 10 -10 0z')
        self.assertTrue(g.contains(Point(15,15)))
        self.assertTrue(g.contains(Point(45,15)))
        self.assertFalse(g.contains(Point(25,15)))
        for d in ['m0 0 q1 1 2 2 z','m0 0 10 0 0 10','m0 0 c1 2 3z','m0 0 10 0 m30 0 10 0z']:
            with self.assertRaises(ValueError): svg_polygon_relative(d)

    def test_dated_east_excludes_west_islands_and_cropped_border(self):
        fs,report=extract();f=fs[0];g=shape(f['geometry']);b=shape(f['properties']['compilation']['boundaryGeometry'])
        self.assertTrue(g.is_valid and not g.is_empty)
        self.assertLessEqual(report['registration']['maxCheckErrorKm'],50)
        self.assertEqual(f['properties']['snapshotYear'],742)
        self.assertEqual(f['properties']['relation'],'administration')
        self.assertGreaterEqual(g.bounds[0],105)
        for xy in [(108.92861,34.25833),(112.43684,34.67345),(118.77778,32.06167),(113.25,23.11667)]:
            self.assertTrue(g.contains(Point(xy)),xy)
        for xy in [(104.06667,30.66667),(94.68333,40.16667),(121,24),(125,25),(120.205475,31.205970)]:
            self.assertFalse(g.contains(Point(xy)),xy)
        self.assertGreater(g.boundary.difference(b.buffer(.0001)).length,.1)
        # The crop meridian exists only as a fill limit; no national line closes it.
        self.assertFalse(any(all(abs(p[0]-105)<.00001 for p in line) for line in f['properties']['compilation']['boundaryGeometry']['coordinates']))
        check=subprocess.run([sys.executable,str(Path(__file__).resolve().parents[1]/'geometry_check.py')],input=json.dumps({'features':fs}),text=True,capture_output=True)
        self.assertEqual(check.returncode,0,check.stdout)

if __name__=='__main__':unittest.main()
