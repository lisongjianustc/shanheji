import {validateDataset} from '../../scripts/data/validate';
import {makeCatalog,makePackage} from '../fixtures/make';
it('rejects duplicate IDs with differing content',()=>{const a=makePackage('a'),b=makePackage('b');b.events[0].title='conflict';expect(validateDataset(makeCatalog(),[a,b]).some(i=>i.code==='ID_CONFLICT')).toBe(true)});
it('rejects missing source references',()=>{const c=makeCatalog();c.sources=[];expect(validateDataset(c,[makePackage()]).some(i=>i.code==='MISSING_SOURCE')).toBe(true)});
it('rejects unlicensed copied geometry',()=>{const c=makeCatalog();c.sources[0].redistribution='unknown';expect(validateDataset(c,[makePackage()]).some(i=>i.code==='GEOMETRY_PERMISSION')).toBe(true)});
it('rejects dangling place references',()=>{const p=makePackage();p.events[0].placeIds=['absent'];expect(validateDataset(makeCatalog(),[p]).some(i=>i.code==='MISSING_PLACE')).toBe(true)});
it('allows repeated identical records across packages',()=>expect(validateDataset(makeCatalog(),[makePackage('a'),makePackage('b')])).toEqual([]));
