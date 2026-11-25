import { useState } from "react";
import { LEGAL_CATEGORIES } from "../../context/CaseContext";
import { Screen, TitleBar } from "../ui/Screen";
import { Button, Select, TextInput } from "../ui/Controls";
import { ExtractBox, ExtractRow } from "../ui/ExtractBox";

const DEMO_FIELDS = {
  type: "Demand letter",
  responseDue: "14 days",
  parties: "",
  category: "",
};

/**
 * Scan Document (brief sections B3/B6). No real OCR exists, so this never
 * uploads or processes the file - the "extracted fields" are an editable
 * demo starting point, clearly labelled as such, not a claim that AI read
 * the document.
 */
export default function ScanDocumentScreen({ onBack, onUseInfo }) {
  const [fileName, setFileName] = useState("");
  const [fields, setFields] = useState(DEMO_FIELDS);

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : "");
    // Intentionally not uploaded anywhere - see component docstring.
  }

  function set(key) {
    return (e) => setFields((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleUseInfo() {
    const title = [fields.type, fields.parties].filter(Boolean).join(" — ");
    const descriptionParts = [];
    if (fields.type) descriptionParts.push(`Document type: ${fields.type}.`);
    if (fields.responseDue) descriptionParts.push(`Response due: ${fields.responseDue}.`);
    if (fields.parties) descriptionParts.push(`Parties: ${fields.parties}.`);

    onUseInfo({
      title,
      description: descriptionParts.join(" "),
      category: fields.category || null,
      jurisdiction: null,
      urgency: null,
    });
  }

  return (
    <Screen>
      <TitleBar title="Scan Document" onBack={onBack} />
      <div className="p-4 flex-1 flex flex-col">
        <label className="border-2 border-dashed border-border-strong rounded-md bg-ice h-36 flex flex-col items-center justify-center gap-2 text-slate text-[11px] mb-3 cursor-pointer">
          <span className="text-2xl opacity-50">📷</span>
          <span>{fileName || "Position document in frame, or choose a file"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
        </label>

        <ExtractBox labelText="EXTRACTED (basic extraction — demo)" isAiGenerated={false}>
          <ExtractRow label="Type">
            <TextInput value={fields.type} onChange={set("type")} className="text-right max-w-[160px]" />
          </ExtractRow>
          <ExtractRow label="Response due">
            <TextInput value={fields.responseDue} onChange={set("responseDue")} className="text-right max-w-[160px]" />
          </ExtractRow>
          <ExtractRow label="Parties">
            <TextInput value={fields.parties} onChange={set("parties")} placeholder="e.g. Landlord vs tenant" className="text-right max-w-[160px]" />
          </ExtractRow>
          <ExtractRow label="Suggested category">
            <Select value={fields.category} onChange={set("category")} className="text-right max-w-[160px]">
              <option value="">Not set</option>
              {LEGAL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </ExtractRow>
        </ExtractBox>

        <p className="text-[10.5px] text-slate leading-relaxed mb-4">
          This demo does not upload or scan your document — the fields above are a sample for you to
          edit. Nothing is stored. (Kenya Data Protection Act, 2019.)
        </p>

        <div className="flex-1" />
        <Button onClick={handleUseInfo}>Use this info →</Button>
      </div>
    </Screen>
  );
}
