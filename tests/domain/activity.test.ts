import { entityActiveInYear } from "../../src/domain/time";
import { buildBands } from "../../src/features/timeline/bands";
import { makeCatalog, makeQuery, time } from "../fixtures/make";
it("同一政权复国前的中断期不显示存续条带", () => {
  const e = {
    ...makeCatalog().entities[0],
    existence: time(618, 907),
    activePeriods: [time(618, 690), time(705, 907)],
  };
  expect(entityActiveInYear(e, 700)).toBe(false);
  expect(entityActiveInYear(e, 705)).toBe(true);
  expect(
    buildBands([e], makeQuery().filters).map((b) => [b.startYear, b.endYear]),
  ).toEqual([
    [618, 690],
    [705, 907],
  ]);
});
