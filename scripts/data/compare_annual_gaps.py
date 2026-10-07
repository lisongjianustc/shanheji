"""Compare annual source-presence states to a committed baseline, never completeness."""
import argparse,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def baseline(ref,path):
    return json.loads(subprocess.check_output(['git','show',f'{ref}:{path}'],cwd=ROOT,text=True))

def status(row,year):
    return next(s['status'] for s in row['spans'] if s['startYear']<=year<=s['endYear'])

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--baseline-ref',required=True)
    parser.add_argument('--checked-at',required=True)
    parser.add_argument('--output',help='Project-relative audit path; preserve earlier same-day comparisons')
    args=parser.parse_args()
    before=baseline(args.baseline_ref,'data/audits/annual-query-sweep.json')
    after=json.loads((ROOT/'data/audits/annual-query-sweep.json').read_text())
    old={r['id']:r for r in before['rows']};new={r['id']:r for r in after['rows']}
    if old.keys()!=new.keys():raise ValueError('Registered phases changed; requires a separate scope comparison')
    rank={'missing':0,'partial':1,'available':2}
    changes=[]
    for id,row in new.items():
        previous=old[id]
        if (row['startYear'],row['endYear'])!=(previous['startYear'],previous['endYear']):
            raise ValueError('Registered dates changed; cannot compare as gap completion')
        for year in range(row['startYear'],row['endYear']+1):
            if year==0:continue
            a,b=status(previous,year),status(row,year)
            if rank[b]<rank[a]:raise ValueError(f'Regressed annual source coverage: {id} {year}')
            if a!=b:changes.append({'phaseId':id,'entityId':row['entityId'],'name':row['name'],'year':year,'before':a,'after':b,'remainingMissingYears':row['missingYears'],'remainingPartialYears':row['partialYears']})
    current_ids={f['properties']['id']:f for p in (ROOT/'data/packages').glob('*/package.json') for f in json.loads(p.read_text())['territories']}
    preserved={'territoryReferences':0,'eventReferences':0};added=set()
    old_ids=set()
    for path in (ROOT/'data/packages').glob('*/package.json'):
        previous=baseline(args.baseline_ref,str(path.relative_to(ROOT)))
        current=json.loads(path.read_text())
        for key in ['territories','events']:
            id_of=(lambda f:f['properties']['id']) if key=='territories' else (lambda e:e['id'])
            by={id_of(f):f for f in current[key]}
            for f in previous[key]:
                if by.get(id_of(f))!=f:raise ValueError(f'Old record changed: {path.name} {id_of(f)}')
            preserved['territoryReferences' if key=='territories' else 'eventReferences']+=len(previous[key])
            if key=='territories':old_ids.update(id_of(f) for f in previous[key])
    added=set(current_ids)-old_ids
    for change in changes:
        change['newFeatureIds']=[id for id in sorted(added) if current_ids[id]['properties']['entityId']==change['entityId'] and current_ids[id]['properties']['snapshotYear']==change['year']]
        if not change['newFeatureIds']:raise ValueError('Annual improvement has no corresponding new sourced snapshot')
    result={'checkedAt':args.checked_at,'baselineRef':args.baseline_ref,'baselineVersion':baseline(args.baseline_ref,'public/data/manifest.json')['version'],'currentVersion':json.loads((ROOT/'public/data/manifest.json').read_text())['version'],'meaning':'比较政权-年资料缺口；有原图范围不等于历史疆界完整、准确或全年实控。仅比较同一批登记名称阶段，未经史学专家审定。','improvedPolityYears':len(changes),'addedUniqueFeatures':len(added),'preservedRecords':preserved,'beforeYearsWithoutAnyGeometry':before['yearsWithoutGeometry'],'afterYearsWithoutAnyGeometry':after['yearsWithoutGeometry'],'changes':changes}
    output=ROOT/(args.output or f'data/audits/annual-gap-progress-{args.checked_at}.json')
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
