import { describe, it, expect } from "vitest";
import { eligibilityVerdict, heuristicFitReport } from "../lib/fit";
import { DEMO_GRANTS, DEMO_ORG } from "../lib/demo";
import { OrgProfileZ } from "../lib/validate";
import { NextRequest } from "next/server";
import { guardAiRequest } from "../lib/request-guard";
const grant = DEMO_GRANTS[0];
describe("hard decision boundaries", () => {
  it("does not treat a local government as a state government", () => {
    expect(eligibilityVerdict({...grant, eligibilityCodes:["00"]}, {...DEMO_ORG, orgType:"local_government"}).verdict).toBe("ineligible");
  });
  it("never recommends investing in an expired opportunity", () => {
    const r = heuristicFitReport({...grant, closeDate:"2020-01-01", eligibilityCodes:["12"]},DEMO_ORG);
    expect(r.recommendation).toBe("skip");
    expect(r.economics.expectedValueUsd).toBeNull();
  });
  it("keeps undefined Others eligibility uncertain", () => {
    expect(eligibilityVerdict({...grant, eligibilityCodes:["25"], eligibilityDesc:"See full notice"},DEMO_ORG).verdict).toBe("unclear");
  });
});
describe("public endpoint limits", () => {
  it("rejects negative or oversized budgets", () => {
    expect(OrgProfileZ.safeParse({...DEMO_ORG,annualBudgetUsd:-1}).success).toBe(false);
    expect(OrgProfileZ.safeParse({...DEMO_ORG,mission:"x".repeat(3001)}).success).toBe(false);
  });
  it("rejects foreign origins and oversized requests", () => {
    expect(guardAiRequest(new NextRequest("http://localhost:3000/api/ai/profile",{headers:{origin:"https://unrelated.example"}}))?.status).toBe(403);
    expect(guardAiRequest(new NextRequest("http://localhost:3000/api/ai/profile",{headers:{"content-length":"50001"}}))?.status).toBe(413);
  });
  it("limits repeated expensive draft requests", () => {
    const make = () => new NextRequest("http://localhost:3000/api/ai/draft",{headers:{"x-forwarded-for":"test-ip"}});
    for(let i=0;i<6;i++) expect(guardAiRequest(make())).toBeNull();
    expect(guardAiRequest(make())?.status).toBe(429);
  });
});

import { numericFacts, flagUnsupportedFigures } from "../lib/ai/grounding";
describe("proposal evidence checks", () => {
  it("recognizes equivalent budget notation", () => {
    expect([...numericFacts("$1.2 million")]).toEqual(["1200000"]);
    expect([...numericFacts("$1,200,000")]).toEqual(["1200000"]);
  });
  it("flags an invented cumulative participant count", () => {
    const r = flagUnsupportedFigures([{id:"capacity",title:"Capacity",content:"We served over 1,200 youth. We served 340 youth in 2025."}],"Served 340 youth in 2025. Budget $1,200,000.");
    expect(r.sections[0].content).toContain("[ADD: verify");
    expect(r.flagged).toEqual(["capacity"]);
  });
  it("preserves supplied figures and removes em dashes", () => {
    const r = flagUnsupportedFigures([{id:"need",title:"Need",content:"We served 340 youth\u2014in 2025."}],"340 youth in 2025");
    expect(r.flagged).toEqual([]);
    expect(r.sections[0].content).not.toContain("\u2014");
  });
});
import { SavedWorkspaceZ } from "../lib/storage";
it("rejects corrupt persisted workspace shapes before rendering", () => {
  expect(SavedWorkspaceZ.safeParse({org:null, pipeline:null, fitReports:{},proposals:{}}).success).toBe(false);
  expect(SavedWorkspaceZ.safeParse({org:DEMO_ORG,pipeline:[],fitReports:{},proposals:{}}).success).toBe(true);
});
