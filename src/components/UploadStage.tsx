import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";
import type { MaterialItem, OpinionItem, ProjectInfo } from "../types";
import { buildAnalysisPayload, type AnalysisPayload } from "../lib/analysisPreview";
import type { FeedbackConfig } from "../lib/mobileFeedbackConfig";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

interface Props {
  project: ProjectInfo;
  materials: MaterialItem[];
  opinions: OpinionItem[];
  loaded: boolean;
  analyzing: boolean;
  feedbackConfig: FeedbackConfig;
  onFeedbackConfigChange: (config: FeedbackConfig) => void;
  onLoadMaterials: () => void;
  onStartAnalysis: (payload: AnalysisPayload) => void;
}

export function UploadStage({ project, opinions, feedbackConfig, onFeedbackConfigChange, onStartAnalysis }: Props) {
  const [useCases, setUseCases] = useState(["文创", "导视", "活动海报", "表情包"]);
  const [publishLink, setPublishLink] = useState("");

  const toggleUseCase = (value: string) => {
    setUseCases((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const confirmPublish = () => {
    if (publishLink) {
      onStartAnalysis(buildAnalysisPayload({
        project,
        useCases,
        imageSources: [],
        textSources: opinions.map((item, index) => ({
          id: `T${String(index + 1).padStart(3, "0")}`,
          speaker: `${item.role}代表`,
          role: item.role,
          importance: index === 0 ? "high" : "normal",
          relatedImages: "",
          content: item.content,
        })),
      }));
      return;
    }
    const token = `opinion-${Date.now().toString(36)}`;
    setPublishLink(`${window.location.origin}/mobile-feedback?invite=${token}`);
  };

  return (
    <main className="min-h-[760px] bg-transparent px-4 py-5 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1380px] space-y-6">
        <section className="glass-panel overflow-hidden rounded-[32px] p-5 sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="max-w-4xl">
              <div className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black text-[var(--color-brand-primary)]">
                <Sparkles size={14} /> 发布管理
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">大众意见收集</h1>
              <p className="mt-3 text-base font-semibold leading-8 text-slate-500">
                当前页面用于确认并发布手机端意见征集流程。发布后系统会生成专属链接，参与者可通过链接在手机端打开对应的共创意见填写页面。
              </p>
            </div>

            <ProjectInfoModule config={feedbackConfig} onChange={onFeedbackConfigChange} useCases={useCases} onToggleUseCase={toggleUseCase} />

            <DimensionManager config={feedbackConfig} onChange={onFeedbackConfigChange} />

            <div className="flex flex-col gap-3 rounded-[28px] bg-white/32 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">发布后将生成手机端专属访问链接</div>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">链接可复制给参与者，手机端会展示右侧模拟器中的交互式意见收集 UI。</p>
                {publishLink ? (
                  <a href={publishLink} className="mt-3 block break-all rounded-2xl bg-white/58 px-4 py-3 text-xs font-black text-[var(--color-brand-primary)] transition hover:bg-white/78">
                    {publishLink}
                  </a>
                ) : null}
              </div>
              <Button variant="gradient" size="lg" className="shrink-0" onClick={confirmPublish}>
                <CheckCircle2 size={18} />
                {publishLink ? "查看意见汇总" : "确认发布"}
              </Button>
            </div>
          </div>
        </section>

      </motion.div>
    </main>
  );
}

function ProjectInfoModule({ config, onChange, useCases, onToggleUseCase }: { config: FeedbackConfig; onChange: (config: FeedbackConfig) => void; useCases: string[]; onToggleUseCase: (value: string) => void }) {
  const [editing, setEditing] = useState(false);

  const updateConfig = (patch: Partial<FeedbackConfig>) => onChange({ ...config, ...patch });

  return (
    <Card className="p-5">
      <ModuleTitle title="项目基础信息" action={<Button variant="secondary" size="sm" onClick={() => setEditing((current) => !current)}>{editing ? "完成" : "修改"}</Button>} />
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2 text-xs font-bold text-slate-500">项目名称<Input value={config.projectName} readOnly={!editing} onChange={(event) => updateConfig({ projectName: event.target.value })} /></label>
        <label className="space-y-2 text-xs font-bold text-slate-500">设计对象<Input value={config.designObject} readOnly={!editing} onChange={(event) => updateConfig({ designObject: event.target.value })} /></label>
        <label className="col-span-2 space-y-2 text-xs font-bold text-slate-500">地区<Input value={config.region} readOnly={!editing} onChange={(event) => updateConfig({ region: event.target.value })} /></label>
        <label className="col-span-2 space-y-2 text-xs font-bold text-slate-500">风格倾向<Input value={config.style} readOnly={!editing} onChange={(event) => updateConfig({ style: event.target.value })} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["文创", "导视", "活动海报", "表情包", "社交传播"].map((item) => (
          <button key={item} onClick={() => onToggleUseCase(item)} className={`rounded-full border px-4 py-2 text-sm font-bold ${useCases.includes(item) ? "border-white/60 bg-white/45 text-[var(--color-brand-primary)] shadow-sm" : "border-white/40 bg-white/25 text-[var(--color-text-muted)]"}`}>
            {item}
          </button>
        ))}
      </div>

    </Card>
  );
}

function DimensionManager({ config, onChange }: { config: FeedbackConfig; onChange: (config: FeedbackConfig) => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const updateDimension = (index: number, patch: Partial<FeedbackConfig["dimensions"][number]>) => {
    if (!unlocked) return;
    onChange({
      ...config,
      dimensions: config.dimensions.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
  };

  const removeDimension = (index: number) => {
    if (!unlocked || config.dimensions.length <= 1) return;
    onChange({ ...config, dimensions: config.dimensions.filter((_, itemIndex) => itemIndex !== index) });
  };

  const addDimension = () => {
    if (!unlocked) return;
    onChange({
      ...config,
      dimensions: [
        ...config.dimensions,
        {
          key: `custom-${Date.now()}`,
          title: `新增维度 ${config.dimensions.length + 1}`,
          hint: "请填写这个维度在手机端的问题提示",
          detail: "说明该维度希望参与者补充哪些意见。",
        },
      ],
    });
  };

  const moveDimension = (fromIndex: number, direction: -1 | 1) => {
    if (!unlocked) return;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= config.dimensions.length) return;
    const nextDimensions = [...config.dimensions];
    const [moved] = nextDimensions.splice(fromIndex, 1);
    nextDimensions.splice(toIndex, 0, moved);
    onChange({ ...config, dimensions: nextDimensions });
  };

  return (
    <div className={`rounded-[30px] border p-5 transition-all ${unlocked ? "border-blue-200/70 bg-white/42 shadow-[0_18px_54px_rgba(49,95,232,0.12)]" : "border-white/55 bg-white/24 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)]"}`}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900">采集用户意见维度</h3>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${unlocked ? "bg-blue-50 text-[var(--color-brand-primary)]" : "bg-white/60 text-[var(--color-text-muted)]"}`}>
              {unlocked ? "已解锁，可编辑" : "已锁定，仅预览"}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {unlocked ? "可在维度卡片内直接编辑、新增、删除和调整顺序，右侧手机端实时同步。" : "默认锁定避免误改；点击右侧按钮后进入编辑状态。"}
          </p>
        </div>
        <div className="flex gap-2">
          {unlocked ? <Button variant="secondary" size="sm" onClick={addDimension}>增加维度</Button> : null}
          <Button variant={unlocked ? "outline" : "secondary"} size="sm" onClick={() => setUnlocked((current) => !current)}>
            {unlocked ? "确定" : "编辑"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {config.dimensions.map((dimension, index) => (
          <article key={dimension.key} className={`rounded-[24px] border p-4 transition-all ${unlocked ? "border-blue-100 bg-white/56 shadow-[0_14px_36px_rgba(49,95,232,0.10)]" : "border-white/50 bg-white/30"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">维度 {index + 1}</div>
                <h4 className="mt-1 text-base font-black text-slate-950">{dimension.title || "未命名维度"}</h4>
              </div>
              {unlocked ? (
                <button type="button" onClick={() => removeDimension(index)} disabled={config.dimensions.length <= 1} className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-black text-slate-400 transition hover:text-rose-500 disabled:opacity-30">
                  删除
                </button>
              ) : null}
            </div>

            {unlocked ? (
              <div className="mt-4 space-y-3">
                <label className="block space-y-1.5 text-xs font-bold text-slate-500">维度名称<Input value={dimension.title} onChange={(event) => updateDimension(index, { title: event.target.value })} /></label>
                <label className="block space-y-1.5 text-xs font-bold text-slate-500">手机端提示<Input value={dimension.hint} onChange={(event) => updateDimension(index, { hint: event.target.value })} /></label>
                <label className="block space-y-1.5 text-xs font-bold text-slate-500">页面说明<Input value={dimension.detail} onChange={(event) => updateDimension(index, { detail: event.target.value })} /></label>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-white/46 px-3 py-3">
                  <div className="text-[11px] font-black text-slate-400">手机端提示</div>
                  <div className="mt-1 text-sm font-bold leading-6 text-slate-700">{dimension.hint}</div>
                </div>
                <div className="rounded-2xl bg-white/36 px-3 py-3">
                  <div className="text-[11px] font-black text-slate-400">页面说明</div>
                  <div className="mt-1 text-sm font-semibold leading-6 text-slate-600">{dimension.detail}</div>
                </div>
              </div>
            )}

            <div className={`mt-4 flex gap-2 ${unlocked ? "opacity-100" : "pointer-events-none opacity-35"}`}>
              <button type="button" onClick={() => moveDimension(index, -1)} disabled={!unlocked || index === 0} className="flex-1 rounded-full bg-white/60 px-3 py-2 text-xs font-black text-slate-500 disabled:opacity-30">上移</button>
              <button type="button" onClick={() => moveDimension(index, 1)} disabled={!unlocked || index === config.dimensions.length - 1} className="flex-1 rounded-full bg-white/60 px-3 py-2 text-xs font-black text-slate-500 disabled:opacity-30">下移</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ModuleTitle({ title, pill, action }: { title: string; pill?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-slate-800">{title}</h2>
      </div>
      {action ?? (pill ? <span className="glass-chip rounded-full px-3 py-2 text-xs font-bold text-[var(--color-brand-primary)]">{pill}</span> : null)}
    </div>
  );
}
