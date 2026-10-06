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
  for index in [1376,4833,2626,2599,1609,4490,5708]: self.assertIn(index,rejected)
  ids={f['properties']['id']:f for f in self.fs}
  for index in [6943,11022]:
   g=shape(ids[f'clio-v021-{index}']['geometry']);self.assertTrue(g.is_valid)
   for xy in [(116.4,39.9),(113.25,23.12)]:self.assertTrue(g.contains(Point(xy)))
  self.assertEqual(len(ids),573)
  self.assertEqual(self.audit['excluded'],128)
 def test_oasis_early_conflicts_and_terminal_records_stay_quarantined(self):
  rejected={r['rowIndex'] for r in self.audit['records'] if r['status']=='excluded'}
  self.assertTrue({3180,3210,4070,4309}.issubset(rejected))
  ids={f['properties']['id']:f for f in self.fs}
  for index in [3492,3630,3687,3706,3463,4163,4373,4816]:
   self.assertTrue(shape(ids[f'clio-v021-{index}']['geometry']).is_valid)
  entities={e['id']:e for e in read(ROOT/'data/catalog/entities.json')};c=read(CONFIG)
  self.assertIsNone(select_entity(dict(Name='Ganzhou Kingdom',FromYear=990,ToYear=1033,Type='POLITY',Wikidata='Q1000124'),entities,c)[0])
  self.assertIsNone(select_entity(dict(Name='Qocho Kingdom',FromYear=888,ToYear=1009,Type='POLITY',Wikidata='Q1923401'),entities,c)[0])
 def test_new_identity_checks_do_not_merge_warring_states_qi_or_extend_terminal_records(self):
  entities={e['id']:e for e in read(ROOT/'data/catalog/entities.json')};c=read(CONFIG)
  self.assertIsNone(select_entity(dict(Name='Qi Kingdom',FromYear=911,ToYear=921,Type='POLITY',Wikidata='Q750739'),entities,c)[0])
  self.assertIsNone(select_entity(dict(Name='Qi Kingdom',FromYear=922,ToYear=925,Type='POLITY',Wikidata='Q1319681'),entities,c)[0])
  self.assertIsNone(select_entity(dict(Name='Kara-Khitans',FromYear=1216,ToYear=1219,Type='POLITY',Wikidata='Q862304'),entities,c)[0])
  rejected={r['rowIndex'] for r in self.audit['records'] if r['status']=='excluded'}
  self.assertTrue({3691,5437}.issubset(rejected))
 def test_ambiguous_han_stages_and_relation_unions_are_not_polities(self):
  entities={e['id']:e for e in read(ROOT/'data/catalog/entities.json')};c=read(CONFIG)
  for props in [dict(Name='Han Dynasty',FromYear=6,ToYear=13,Type='POLITY'),dict(Name='Later Zhou',FromYear=-750,ToYear=-451,Type='POLITY'),dict(Name='Northern Song',FromYear=1126,ToYear=1138,Type='POLITY'),dict(Name='Ming Dynasty',FromYear=1415,ToYear=1421,Type='RELATION')]:
   self.assertIsNone(select_entity(props,entities,c)[0])
if __name__=='__main__':unittest.main()
