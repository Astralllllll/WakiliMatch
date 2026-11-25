import { describe, expect, it } from "vitest";
import { resolveCounty, KENYAN_COUNTIES } from "./countyValidator.js";

describe("resolveCounty - garbage/filler answers never resolve (bug 2's core symptom)", () => {
  it.each(["home", "here", "my house", ""])("treats %j as unresolved, never a county", (text) => {
    const result = resolveCounty(text);
    expect(result.status).toBe("unresolved");
    expect(result.county).toBeNull();
  });
});

describe("resolveCounty - fuzzy typo correction", () => {
  it("resolves a one-letter typo", () => {
    expect(resolveCounty("Nairobbi")).toMatchObject({ status: "resolved", county: "Nairobi" });
  });
});

describe("resolveCounty - town/estate aliases", () => {
  it("resolves Westlands to Nairobi", () => {
    expect(resolveCounty("Westlands")).toMatchObject({ status: "resolved", county: "Nairobi" });
  });

  it("resolves Ruiru to Kiambu", () => {
    expect(resolveCounty("Ruiru")).toMatchObject({ status: "resolved", county: "Kiambu" });
  });

  it("resolves Eldoret to Uasin Gishu, not as its own county", () => {
    expect(resolveCounty("Eldoret")).toMatchObject({ status: "resolved", county: "Uasin Gishu" });
  });

  it("resolves the rest of the brief's example aliases", () => {
    expect(resolveCounty("Kilimani").county).toBe("Nairobi");
    expect(resolveCounty("Embakasi").county).toBe("Nairobi");
    expect(resolveCounty("Karen").county).toBe("Nairobi");
    expect(resolveCounty("Thika").county).toBe("Kiambu");
    expect(resolveCounty("Juja").county).toBe("Kiambu");
    expect(resolveCounty("Kikuyu").county).toBe("Kiambu");
    expect(resolveCounty("Limuru").county).toBe("Kiambu");
    expect(resolveCounty("Kitengela").county).toBe("Kajiado");
    expect(resolveCounty("Ngong").county).toBe("Kajiado");
    expect(resolveCounty("Rongai").county).toBe("Kajiado");
    expect(resolveCounty("Athi River").county).toBe("Machakos");
    expect(resolveCounty("Syokimau").county).toBe("Machakos");
    expect(resolveCounty("Mavoko").county).toBe("Machakos");
    expect(resolveCounty("Nyali").county).toBe("Mombasa");
    expect(resolveCounty("Likoni").county).toBe("Mombasa");
  });
});

describe("resolveCounty - suffix words stripped", () => {
  it("resolves 'kisumu county' to Kisumu", () => {
    expect(resolveCounty("kisumu county")).toMatchObject({ status: "resolved", county: "Kisumu" });
  });

  it("resolves 'Nakuru town' to Nakuru", () => {
    expect(resolveCounty("Nakuru town")).toMatchObject({ status: "resolved", county: "Nakuru" });
  });
});

describe("resolveCounty - two places named in one sentence", () => {
  it("flags ambiguous rather than silently picking one", () => {
    const result = resolveCounty("I live in Kiambu but the job was in Nairobi");
    expect(result.status).toBe("ambiguous");
    expect(result.candidates).toEqual(expect.arrayContaining(["Kiambu", "Nairobi"]));
    expect(result.candidates).toHaveLength(2);
  });
});

describe("resolveCounty - a plain, correctly-spelled county name", () => {
  it("resolves case-insensitively", () => {
    expect(resolveCounty("nairobi")).toMatchObject({ status: "resolved", county: "Nairobi" });
    expect(resolveCounty("MOMBASA")).toMatchObject({ status: "resolved", county: "Mombasa" });
  });
});

describe("KENYAN_COUNTIES", () => {
  it("has exactly the 47 real counties, no towns masquerading as counties", () => {
    expect(KENYAN_COUNTIES).toHaveLength(47);
    expect(KENYAN_COUNTIES).not.toContain("Eldoret");
    expect(KENYAN_COUNTIES).not.toContain("Thika");
    expect(KENYAN_COUNTIES).toContain("Uasin Gishu");
    expect(KENYAN_COUNTIES).toContain("Kiambu");
  });
});
