import unittest, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from import_tang_661 import svg_to_lonlat, extract_features
from shapely.geometry import shape, Point

class IntakeTest(unittest.TestCase):
 def test_original_projection_corners(self):
  # Original SVG translate + documented geographic extent, not control-point fitting.
  self.assertAlmostEqual(svg_to_lonlat(1138.9966429172798,1113.1949079327358)[0],61,places=6)
  self.assertAlmostEqual(svg_to_lonlat(1138.9966429172798,1113.1949079327358)[1],50,places=6)
  self.assertAlmostEqual(svg_to_lonlat(2427.369894741744,356.2223705384754)[0],130,places=6)
  self.assertAlmostEqual(svg_to_lonlat(2427.369894741744,356.2223705384754)[1],16,places=6)
 def test_layers_remain_separate_and_ocean_is_removed(self):
  features=extract_features()
  self.assertEqual([f['properties']['relation'] for f in features],['administration','administration','claim'])
  for f in features:
   g=shape(f['geometry']);self.assertTrue(g.is_valid);self.assertFalse(g.is_empty)
   self.assertFalse(g.contains(Point(125,25)))
  civil=shape(features[0]['geometry'])
  self.assertTrue(civil.contains(Point(109,34)))
  self.assertFalse(civil.contains(Point(121,24)))
  self.assertEqual(features[0]['properties']['snapshotYear'],661)
  self.assertEqual(features[0]['properties']['validity']['endExclusive']['latest'],'0662-01-01')
  self.assertEqual(features[0]['properties']['spatialPrecision'],'disputed')

if __name__=='__main__': unittest.main()
