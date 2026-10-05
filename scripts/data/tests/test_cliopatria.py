import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from import_cliopatria import extract,select_entity,read,CONFIG,ROOT
from shapely.geometry import shape,Point

class CliopatriaTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.fs,cls.audit=extract()
 def test_rejects_conflicting_chronology_and_preserves_geometry(self):
  rejected={r['rowIndex']:r for r in self.audit['records'] if r['status']=='excluded'}
  for index in [1376,4833,2626,2599,1609]: self.assertIn(index,rejected)
  ids={f['properties']['id']:f for f in self.fs}
  for index in [6943,11022]:
   g=shape(ids[f'clio-v021-{index}']['geometry']);self.assertTrue(g.is_valid)
   for xy in [(116.4,39.9),(113.25,23.12)]:self.assertTrue(g.contains(Point(xy)))
  self.assertEqual(len(ids),515)
  self.assertEqual(self.audit['excluded'],114)
 def test_ambiguous_han_stages_and_relation_unions_are_not_polities(self):
  entities={e['id']:e for e in read(ROOT/'data/catalog/entities.json')};c=read(CONFIG)
  for props in [dict(Name='Han Dynasty',FromYear=6,ToYear=13,Type='POLITY'),dict(Name='Later Zhou',FromYear=-750,ToYear=-451,Type='POLITY'),dict(Name='Northern Song',FromYear=1126,ToYear=1138,Type='POLITY'),dict(Name='Ming Dynasty',FromYear=1415,ToYear=1421,Type='RELATION')]:
   self.assertIsNone(select_entity(props,entities,c)[0])
if __name__=='__main__':unittest.main()
