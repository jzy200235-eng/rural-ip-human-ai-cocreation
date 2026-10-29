import { useState } from "react";
import type { AnalysisPayload } from "../lib/analysisPreview";

export function ModelAnalysisPanel({ payload }: { payload: AnalysisPayload }) {
  const [input, setInput] = useState(payload.textSources.map(item => item.content).join("\n"));
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ranInput, setRanInput] = useState("");
  const run = async () => {
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/workflow/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_meta: { project_name: payload.project.name, region: payload.project.region, design_goal: payload.project.style },
          texts: input.split("\n").filter(s => s.trim()).map((content, i) => ({ source_id: `T${i + 1}`, speaker_name: `演示参与者${i + 1}`, speaker_role: "未知", content })),
          images: payload.imageSources.map(item => ({ image_id: item.id, image_name: item.name, description: item.description, file_url: item.url || "" })),
        }),
      });
      const data = await response.json().catch(() => { throw new Error("后端未返回JSON，请检查8899服务与Vite代理。"); });
      if (!response.ok) throw new Error(data.error || `请求失败：${response.status}`);
      if (!data.design_brief || !data.prompt_result || !Array.isArray(data.provenance_table)) throw new Error("模型返回缺少简报、Prompt或溯源表，未作为成功结果展示。");
      setResult(data); setRanInput(input);
    } catch (e) { setError(e instanceof Error ? e.message : "分析失败"); }
    finally { setBusy(false); }
  };
  return <section className="my-5 rounded-3xl border border-blue-200 bg-white/80 p-5">
    <h2 className="text-xl font-bold">真实模型分析 · 后端接口</h2>
    <p className="my-2 text-sm text-slate-600">独立调用旧版分析工作流。下方提交内容会发送给你配置的模型服务，可能消耗额度，请使用可公开的测试材料。生成简报与Prompt，不生成图片；下方原有矩阵仍是本地规则演示。</p>
    <label className="block text-sm font-semibold">分析文字（每行一条）<textarea className="mt-2 min-h-28 w-full rounded-xl border p-3" value={input} onChange={e => setInput(e.target.value)} disabled={busy}/></label>
    <button className="my-3 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-40" disabled={busy || !input.trim()} onClick={run}>{busy ? "模型分析中，请等待…" : "调用后端分析"}</button>
    <p className="text-xs text-slate-500">Key仅保存在服务端.env，先启动npm run backend；无Key或接口错误会直接提示，不回退为模拟成功。</p>
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    {result && <div className="mt-4 space-y-3" aria-live="polite">
      <p className="font-bold text-green-800">后端分析已返回{input !== ranInput ? "（输入已改动，以下为上次结果）" : ""}</p>
      {([['设计简报', result.design_brief], ['生成Prompt', result.prompt_result], ['设计溯源表', result.provenance_table], ['素材库', result.material_library]] as const).map(([title, data]) => <details key={title} open><summary className="font-bold">{title}</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-xs">{JSON.stringify(data, null, 2)}</pre></details>)}
    </div>}
  </section>;
}
