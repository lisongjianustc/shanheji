import { buildBands } from "../../src/features/timeline/bands";
import { makeCatalog, makeQuery } from "../fixtures/make";
it("keeps contemporary entities on parallel bands", () => {
  const c = makeCatalog();
  c.entities.push({ ...c.entities[0], id: "test-second" });
  expect(
    buildBands(c.entities, makeQuery().filters).map((b) => b.entityId),
  ).toEqual(["test-polity", "test-second"]);
});
