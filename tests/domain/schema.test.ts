import {validitySchema,packageSchema} from '../../src/domain/schema';
const time={start:{earliest:'0300-01-01',latest:'0300-01-01'},endExclusive:{earliest:'0301-01-01',latest:'0301-01-01'},precision:'year',label:'300年'};
it('rejects inverted temporal uncertainty',()=>expect(validitySchema.safeParse({...time,start:{earliest:'0400-01-01',latest:'0300-01-01'}}).success).toBe(false));
it('rejects unknown record fields',()=>expect(validitySchema.safeParse({...time,invented:'x'}).success).toBe(false));
it('permits a valid uncertain year',()=>expect(validitySchema.safeParse(time).success).toBe(true));
it('rejects malformed package arrays',()=>expect(packageSchema.safeParse({id:'a',version:'1',events:'not-array',territories:[],coverage:[]}).success).toBe(false));
