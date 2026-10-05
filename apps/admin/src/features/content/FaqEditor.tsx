import { type FaqEntry, type SiteContent } from "@material-square/types";
export default function FaqEditor({ content, disabled, onChange }: { content: SiteContent; disabled: boolean; onChange: (value: SiteContent) => void }) {
  let entries: FaqEntry[] = [];
  try { entries = JSON.parse(content["faq.entries"]); } catch { /* Saved legacy copy has no entries. */ }
  function save(next: FaqEntry[]) { onChange({ ...content, "faq.entries": JSON.stringify(next) }); }
  function update(index: number, field: keyof FaqEntry, value: string) { save(entries.map((entry, position) => position === index ? { ...entry, [field]: value } : entry)); }
  return <section className="panel-card panel-body"><h2>Frequently asked questions</h2><p>Published entries appear on the contact page. Questions and answers are plain text.</p>{entries.map((entry,index) => <fieldset key={index} disabled={disabled}><legend>FAQ {index+1}</legend><label>Question {index+1}<input required minLength={3} maxLength={200} value={entry.question} onChange={event => update(index,"question",event.target.value)}/></label><label>Answer {index+1}<textarea required minLength={3} maxLength={2000} value={entry.answer} onChange={event => update(index,"answer",event.target.value)}/></label><button className="btn-sm btn-secondary" onClick={() => save(entries.filter((_,position) => position !== index))}>Remove FAQ {index+1}</button></fieldset>)}<button className="btn-sm btn-secondary" disabled={disabled || entries.length >=20} onClick={() => save([...entries,{ question:"",answer:"" }])}>Add FAQ</button></section>;
}
