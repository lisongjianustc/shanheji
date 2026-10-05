import sys,json
from shapely.geometry import shape
from shapely.validation import explain_validity
from shapely import is_valid
x=json.load(sys.stdin);issues=[]
features=x.get('features',[])
for f in features:
    record=f.get('properties',{}).get('id','unknown')
    try:
        g=shape(f['geometry'])
        if not is_valid(g):issues.append({'recordId':record,'message':explain_validity(g)})
        compilation=f.get('properties',{}).get('compilation',{})
        if compilation.get('extent')=='partial-source':
            border=shape(compilation['boundaryGeometry'])
            if border.is_empty or not border.is_valid:issues.append({'recordId':record,'message':'Invalid source border'})
            if border.difference(g.boundary.buffer(.00005)).length > .0001:issues.append({'recordId':record,'message':'Source border must follow the compiled extent boundary'})
        if g.is_empty:issues.append({'recordId':record,'message':'Empty geometry'})
        if not g.is_empty and (g.bounds[0]<-180 or g.bounds[2]>180 or g.bounds[1]<-90 or g.bounds[3]>90):issues.append({'recordId':record,'message':'Coordinate outside WGS84 bounds'})
    except Exception as e:issues.append({'recordId':record,'message':str(e)})
print(json.dumps(issues,ensure_ascii=False));sys.exit(1 if issues else 0)
