import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./aiMatchingClient.js", () => ({
  callAiServiceMatch: vi.fn(),
}));

import { callAiServiceMatch } from "./aiMatchingClient.js";
import { buildDraftFromFacts, MAX_QUESTIONS, runAssistantTurnMock } from "./assistantEngine.js";

function mockAreaDetection(area, status = "success") {
  callAiServiceMatch.mockImplementation(async () => ({
    status,
    xai: area ? { matched_area: area } : null,
  }));
}

async function runConversation(firstMessage, answers, area) {
  mockAreaDetection(area);
  let state = {};
  const questions = [];
  let turn = await runAssistantTurnMock(state, firstMessage);
  state = { facts: turn.facts, askedSlots: turn.askedSlots, turnsAsked: turn.turnsAsked, lastAskedSlot: turn.lastAskedSlot, bankArea: turn.bankArea };
  if (!turn.readyToDraft) questions.push(turn.reply);

  for (const answer of answers) {
    if (turn.readyToDraft) break;
    turn = await runAssistantTurnMock(state, answer);
    state = { facts: turn.facts, askedSlots: turn.askedSlots, turnsAsked: turn.turnsAsked, lastAskedSlot: turn.lastAskedSlot, bankArea: turn.bankArea };
    if (!turn.readyToDraft) questions.push(turn.reply);
  }

  return { questions, finalTurn: turn, facts: turn.facts };
}

beforeEach(() => {
  callAiServiceMatch.mockReset();
});

describe("three different issues produce three different question sequences", () => {
  it("unfair dismissal asks employment-specific slots", async () => {
    const { questions, facts } = await runConversation(
      "I was dismissed from my job without notice",
      ["Last week", "No notice or severance was given", "I have payslips", "I'd like compensation", "Nairobi"],
      "Employment & Labour"
    );
    expect(facts.area).toBe("Employment & Labour");
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.some((q) => /notice or severance/i.test(q))).toBe(true);
  });

  it("landlord locked my shop asks property-specific slots", async () => {
    const { questions, facts } = await runConversation(
      "My landlord locked my shop because I was late with rent",
      ["I rent it, the landlord did this", "I have a lease agreement", "No notice was served", "Nairobi"],
      "Land & Property"
    );
    expect(facts.area).toBe("Land & Property");
    // "landlord" in the first message already fills `other_party` via
    // extraction, so the own-or-rent question is correctly skipped - the
    // next relevant slot (title deed/lease) should be asked instead.
    expect(questions.some((q) => /title deed|lease/i.test(q))).toBe(true);
  });

  it("brother was arrested asks criminal-specific slots", async () => {
    const { questions, facts } = await runConversation(
      "My brother was arrested last night",
      ["He was charged at the station", "Kilimani police station", "No bail date yet", "Nairobi"],
      "Criminal"
    );
    expect(facts.area).toBe("Criminal");
    expect(questions.some((q) => /arrested|charged/i.test(q))).toBe(true);
  });

  it("the three scenarios' question sets are not identical to each other", async () => {
    const employment = await runConversation(
      "I was dismissed from my job without notice",
      ["Last week", "No notice given", "Payslips", "Compensation", "Nairobi"],
      "Employment & Labour"
    );
    const property = await runConversation(
      "My landlord locked my shop because I was late with rent",
      ["I rent it", "Lease agreement", "No notice", "Nairobi"],
      "Land & Property"
    );
    const criminal = await runConversation(
      "My brother was arrested last night",
      ["Charged", "Kilimani station", "No bail date", "Nairobi"],
      "Criminal"
    );
    expect(employment.questions).not.toEqual(property.questions);
    expect(employment.questions).not.toEqual(criminal.questions);
    expect(property.questions).not.toEqual(criminal.questions);
  });
});

describe("a slot already answered in an earlier message is never re-asked", () => {
  it("'I was fired in March 2024' fills `when` immediately, skipping that question", async () => {
    mockAreaDetection("Employment & Labour");
    const first = await runAssistantTurnMock({}, "I was fired in March 2024");
    expect(first.facts.when).toBe("march 2024");
    expect(first.reply).not.toMatch(/when did this happen/i);
  });
});

describe("no repeated questions, one per turn, capped at the question limit", () => {
  it("never asks the exact same question text twice in one conversation", async () => {
    mockAreaDetection("Employment & Labour");
    let state = {};
    const asked = [];
    let turn = await runAssistantTurnMock(state, "I was dismissed from my job");
    for (let i = 0; i < MAX_QUESTIONS + 2 && !turn.readyToDraft; i++) {
      asked.push(turn.reply);
      state = { facts: turn.facts, askedSlots: turn.askedSlots, turnsAsked: turn.turnsAsked, lastAskedSlot: turn.lastAskedSlot, bankArea: turn.bankArea };
      turn = await runAssistantTurnMock(state, "some answer");
    }
    expect(new Set(asked).size).toBe(asked.length);
  });

  it("stops after at most 5 questions", async () => {
    mockAreaDetection("Employment & Labour");
    let state = {};
    let turn = await runAssistantTurnMock(state, "I was dismissed from my job");
    let questionCount = 0;
    for (let i = 0; i < 10 && !turn.readyToDraft; i++) {
      questionCount += 1;
      state = { facts: turn.facts, askedSlots: turn.askedSlots, turnsAsked: turn.turnsAsked, lastAskedSlot: turn.lastAskedSlot, bankArea: turn.bankArea };
      turn = await runAssistantTurnMock(state, "some vague answer");
    }
    expect(questionCount).toBeLessThanOrEqual(MAX_QUESTIONS);
    expect(turn.readyToDraft).toBe(true);
  });
});

describe("gibberish or off-topic first message gets an open follow-up, no area guessed", () => {
  it("does not set what_happened or area for invalid input", async () => {
    mockAreaDetection(null, "invalid_input");
    const turn = await runAssistantTurnMock({}, "asdfgh qwerty zxcvb");
    expect(turn.facts.what_happened).toBeUndefined();
    expect(turn.facts.area).toBeUndefined();
    expect(turn.readyToDraft).toBe(false);
    expect(turn.reply).toMatch(/tell me a bit more/i);
  });
});

describe("outcome-prediction questions are declined, fact-gathering continues", () => {
  it("declines 'will I win?' but still asks the next question in the same turn", async () => {
    mockAreaDetection("Employment & Labour");
    const first = await runAssistantTurnMock({}, "I was dismissed from my job, will I win my case?");
    expect(first.reply).toMatch(/can't predict how a case will turn out/i);
    expect(first.readyToDraft).toBe(false);
  });
});

describe("emergency keywords get an acknowledgment without stopping the flow", () => {
  it("still continues gathering facts after flagging urgency", async () => {
    mockAreaDetection("Criminal");
    const first = await runAssistantTurnMock({}, "My brother was just arrested");
    expect(first.reply).toMatch(/urgent help from a lawyer/i);
    expect(first.readyToDraft).toBe(false);
  });
});

describe("county: re-asked once, then given up on (Deliverable 4, bug 2, subsumed by the general slot mechanism)", () => {
  it("never stores 'home' as the county, asks again once, then proceeds without it", async () => {
    mockAreaDetection("Employment & Labour");
    let turn = await runAssistantTurnMock({}, "I was dismissed from my job");
    // Drive every other slot to its limit so county is the only thing left,
    // answering "home" each time it's asked.
    for (let i = 0; i < MAX_QUESTIONS + 2 && !turn.readyToDraft; i++) {
      const state = { facts: turn.facts, askedSlots: turn.askedSlots, turnsAsked: turn.turnsAsked, lastAskedSlot: turn.lastAskedSlot, bankArea: turn.bankArea };
      const answer = turn.lastAskedSlot === "county" ? "home" : "some answer";
      turn = await runAssistantTurnMock(state, answer);
    }
    expect(turn.facts.county).toBeUndefined();
    const draft = buildDraftFromFacts(turn.facts);
    expect(draft.jurisdiction).toBeNull();
  });
});

describe("buildDraftFromFacts", () => {
  it("never fabricates a jurisdiction from an unresolved county", () => {
    const draft = buildDraftFromFacts({ what_happened: "test", county: "home" });
    expect(draft.jurisdiction).toBeNull();
    expect(draft.jurisdictionNeedsClarification).toBe(true);
  });

  it("resolves a real county", () => {
    const draft = buildDraftFromFacts({ what_happened: "test", county: "Westlands" });
    expect(draft.jurisdiction).toBe("Nairobi");
  });
});

describe("LLM_PROVIDER fallback (module-level, isolated import)", () => {
  afterEach(() => {
    delete process.env.LLM_PROVIDER;
    vi.resetModules();
  });

  it("falls back to the mock engine without throwing when a real provider is configured but unimplemented", async () => {
    vi.resetModules();
    process.env.LLM_PROVIDER = "openai";
    const fresh = await import("./assistantEngine.js");
    mockAreaDetection("Employment & Labour");
    const turn = await fresh.runAssistantTurn({}, "I was dismissed from my job");
    expect(turn).toBeDefined();
    expect(turn.readyToDraft).toBe(false);
    expect(typeof turn.reply).toBe("string");
  });
});
