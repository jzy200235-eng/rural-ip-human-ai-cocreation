import { Check, CheckCircle2, ChevronLeft, ChevronRight, Hash, Layers, Link2, SlidersHorizontal, Smartphone, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { RoundConfig } from "../types";
import type { RoundPanelState } from "../lib/workspaceState";
import { saveInteractiveEvolutionSourcePlans } from "../lib/interactiveEvolutionSelection";
import { Button } from "./ui/button";

interface SelectedPlan {
  id: string;
  index: number;
  title: string;
  imageUrl?: string;
  description?: string;
  keywords?: string[];
  consensus?: number;
}

interface Props {
  initialConfig: RoundConfig;
  running: boolean;
  selectedPlans: SelectedPlan[];
  onStartRound: (config: RoundConfig) => void;
  onViewResults: () => void;
  open?: boolean;
  onToggle?: () => void;
  // 跨页面恢复用：初始面板状态 + 状态变更回调（与画布视口的 initial*/onChange 模式一致）
  initialPanelState?: RoundPanelState;
  onPanelStateChange?: (state: RoundPanelState) => void;
  targetStageLabel?: string;
  selectionHint?: string;
  confirmedMessage?: string;
  finalSelectionActive?: boolean;
  finalSelectedCount?: number;
  onToggleFinalSelection?: () => void;
  onConfirmFinalSelection?: () => void;
}

const SUBJECTS = ["村民", "商户", "手艺人", "游客"] as const;
const INTERACTIVE_EVOLUTION_PATH = "/interactive-evolution-demo";
const EVAL_OPTIONS = [
  { key: "10", label: "10 个" },
  { key: "20", label: "20 个" },
  { key: "custom", label: "自定义" },
] as const;

function getInteractiveEvolutionUrl() {
  if (typeof window === "undefined") return INTERACTIVE_EVOLUTION_PATH;
  return `${window.location.origin}${INTERACTIVE_EVOLUTION_PATH}`;
}

function normalizeGeneratedLink(link: string | null | undefined) {
  if (!link) return null;
  return link.includes("co.ardot.app") || link.includes(INTERACTIVE_EVOLUTION_PATH) ? getInteractiveEvolutionUrl() : link;
}

export function RoundManagementPanel({ initialConfig, running, selectedPlans, onStartRound, onViewResults, open = false, onToggle, initialPanelState, onPanelStateChange, targetStageLabel = "第一轮", selectionHint = "请在画布中勾选要进入本轮的初代方案（可多选）。", confirmedMessage = "将选中的初代方案作为第 1 代候选方案发送给多主体进行偏好评价。", finalSelectionActive = false, finalSelectedCount = 0, onToggleFinalSelection, onConfirmFinalSelection }: Props) {
  const [confirmed, setConfirmed] = useState(initialPanelState?.confirmed ?? false);
  const [participants, setParticipants] = useState<string[]>(initialPanelState?.participants ?? initialConfig.participants);
  const [weights, setWeights] = useState<Record<string, number>>(initialPanelState?.weights ?? initialConfig.weights);
  const [evalMode, setEvalMode] = useState<"10" | "20" | "custom">(initialPanelState?.evalMode ?? "10");
  const [customEval, setCustomEval] = useState(initialPanelState?.customEval ?? 15);
  const [generatedLink, setGeneratedLink] = useState<string | null>(() => normalizeGeneratedLink(initialPanelState?.generatedLink));

  // 面板任一操作状态变化即上报上层持久化，保证切换页面再返回时可整体恢复，无需重新「生成链接」
  useEffect(() => {
    onPanelStateChange?.({ confirmed, participants, weights, evalMode, customEval, generatedLink });
  }, [confirmed, participants, weights, evalMode, customEval, generatedLink, onPanelStateChange]);

  const evalPerPerson = evalMode === "custom" ? customEval : Number(evalMode);

  const toggleParticipant = (subject: string) => {
    setParticipants((current) => (current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject]));
  };

  const setWeight = (subject: string, value: number) => {
    setWeights((current) => ({ ...current, [subject]: value }));
  };

  const persistInteractiveEvolutionSource = () => {
    saveInteractiveEvolutionSourcePlans(selectedPlans);
  };

  const generateLink = () => {
    const config: RoundConfig = {
      targetStage: targetStageLabel,
      selectedPlanIds: selectedPlans.map((plan) => plan.id),
      participants,
      weights,
      evalPerPerson,
      publishMethod: "link",
    };
    persistInteractiveEvolutionSource();
    setGeneratedLink(getInteractiveEvolutionUrl());
    onStartRound(config);
  };

  const canGenerate = confirmed && selectedPlans.length > 0 && participants.length > 0;
  const handleFinalSelectionClick = () => {
    if (finalSelectionActive && finalSelectedCount > 0) {
      onConfirmFinalSelection?.();
      return;
    }
    onToggleFinalSelection?.();
  };

  return (
    <aside
      className={`fixed bottom-0 right-0 top-[56px] z-50 w-[380px] transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* 发起共创 / 收起 按钮：固定在边栏左上角外侧，跟随边栏一同展开收起 */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "收起边栏" : "发起共创"}
        className={`app-gradient-primary absolute right-full top-4 z-40 flex items-center justify-center gap-1.5 whitespace-nowrap text-white shadow-[-8px_10px_26px_rgba(49,95,232,0.28)] transition-all duration-300 ease-out hover:brightness-105 ${
          open ? "h-8 w-5 rounded-l-md p-0" : "rounded-l-xl py-2 pl-2.5 pr-3 text-xs font-semibold"
        }`}
      >
        {open ? (
          <ChevronRight size={15} />
        ) : (
          <>
            <ChevronLeft size={15} />
            发起共创
          </>
        )}
      </button>
      {onToggleFinalSelection ? (
        <button
          type="button"
          onClick={handleFinalSelectionClick}
          aria-label="确认最终方案"
          className={`absolute right-full top-16 z-40 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-l-xl border border-white/70 bg-white/86 py-2 pl-2.5 pr-3 text-xs font-black text-[var(--color-brand-primary)] shadow-[-8px_10px_24px_rgba(74,100,160,0.16)] backdrop-blur-xl transition hover:bg-white ${finalSelectionActive ? "ring-4 ring-[color-mix(in_srgb,var(--color-brand-accent)_18%,transparent)]" : ""}`}
        >
          确认最终方案{finalSelectionActive ? `（${finalSelectedCount}）` : ""}
        </button>
      ) : null}
      <div className="h-full overflow-y-auto border-l border-white/45 bg-white/35 px-5 py-5 shadow-[-18px_0_42px_rgba(91,139,255,0.14)] backdrop-blur-2xl">
        {/* 1. 目标阶段（标题与值同行并列） */}
        <Section
          first
          icon={<Layers size={16} />}
          title="目标阶段"
          trailing={<span className="inline-flex items-center rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-[var(--color-brand-primary)]">{targetStageLabel}</span>}
        />

        {/* 2. 选择方案 + 确认 */}
        <Section icon={<CheckCircle2 size={16} />} title="选择方案">
          {!confirmed ? (
            <>
              <p className="text-xs font-semibold leading-6 text-[var(--color-text-muted)]">{selectionHint}</p>
              {selectedPlans.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedPlans.map((plan) => (
                    <PlanChip key={plan.id} index={plan.index} title={plan.title} />
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-3 text-center text-xs font-semibold text-slate-400">尚未勾选任何方案</p>
              )}
              <Button
                variant="gradient"
                size="md"
                className="mt-4 w-full rounded-[14px] text-xs"
                disabled={selectedPlans.length === 0}
                onClick={() => setConfirmed(true)}
              >
                确认所选方案（{selectedPlans.length}）
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {selectedPlans.map((plan) => (
                  <PlanChip key={plan.id} index={plan.index} title={plan.title} />
                ))}
              </div>
              <p className="mt-3 rounded-xl bg-blue-50/80 px-3 py-3 text-xs font-semibold leading-6 text-[var(--color-brand-primary)]">
                {confirmedMessage}
              </p>
              <button
                type="button"
                className="mt-2 text-xs font-bold text-slate-400 underline-offset-2 hover:text-[var(--color-brand-primary)] hover:underline"
                onClick={() => setConfirmed(false)}
              >
                重新选择
              </button>
            </>
          )}
        </Section>

        {/* 3. 参与主体（移除色块，统一为 OptionButton 居中样式） */}
        <Section icon={<Users size={16} />} title="参与主体">
          <div className="grid grid-cols-2 gap-2">
            {SUBJECTS.map((subject) => {
              const active = participants.includes(subject);
              return (
                <OptionButton key={subject} active={active} onClick={() => toggleParticipant(subject)}>
                  {subject}
                  {active ? <Check size={15} /> : null}
                </OptionButton>
              );
            })}
          </div>
        </Section>

        {/* 4. 权重设置 */}
        <Section icon={<SlidersHorizontal size={16} />} title="权重设置">
          {participants.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">请先选择参与主体。</p>
          ) : (
            SUBJECTS.filter((subject) => participants.includes(subject)).map((subject) => (
              <WeightSlider key={subject} label={subject} value={weights[subject] ?? 1} onChange={(value) => setWeight(subject, value)} />
            ))
          )}
        </Section>

        {/* 5. 每人评价数量（与参与主体共用 OptionButton，尺寸/间距统一） */}
        <Section icon={<Hash size={16} />} title="每人评价数量">
          <div className="grid grid-cols-3 gap-2">
            {EVAL_OPTIONS.map((option) => (
              <OptionButton key={option.key} active={evalMode === option.key} onClick={() => setEvalMode(option.key)}>
                {option.label}
              </OptionButton>
            ))}
          </div>
          {evalMode === "custom" ? (
            <label className="mt-3 flex items-center gap-3 text-xs font-bold text-[var(--color-text-default)]">
              自定义数量
              <input
                type="number"
                min={1}
                max={99}
                value={customEval}
                onChange={(event) => setCustomEval(Math.max(1, Number(event.target.value) || 1))}
                className="h-10 w-20 rounded-lg border border-[var(--color-border-control)] bg-white/72 px-3 text-xs font-bold text-[var(--color-text-default)]"
              />
              个
            </label>
          ) : null}
        </Section>

        {/* 6. 生成链接（去掉「发布方式」标题；生成后于下方展示手机端交互式进化页面链接） */}
        <section className="mt-5 border-t border-dashed border-slate-300/70 pt-5">
          <Button variant="gradient" size="lg" className="w-full rounded-[16px] text-xs" disabled={!canGenerate} onClick={generateLink}>
            <Link2 size={20} />
            生成链接
          </Button>
          {!confirmed ? <p className="mt-2 text-xs font-semibold text-slate-400">请先确认所选方案。</p> : null}
          {generatedLink ? (
            <>
              <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
                <p className="text-xs font-bold text-slate-500">评价链接已生成</p>
                <p className="mt-1 break-all text-xs font-bold text-[var(--color-brand-primary)]">{generatedLink}</p>
              </div>
              <a
                href={INTERACTIVE_EVOLUTION_PATH}
                onClick={persistInteractiveEvolutionSource}
                className="mt-3 flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
              >
                <Smartphone size={18} />
                点击进入手机端交互式进化页面
              </a>
            </>
          ) : null}
        </section>

        {running ? (
          <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4 text-xs font-semibold leading-6 text-green-700">
            <Smartphone className="mr-2 inline" size={18} />
            当前轮次已生成本地演示入口，未向参与者发送。手机端可体验偏好评价与标签反馈，不跨设备同步。
            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={onViewResults}>查看群体反馈结果</Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Section({ icon, title, trailing, children, first }: { icon: ReactNode; title: string; trailing?: ReactNode; children?: ReactNode; first?: boolean }) {
  return (
    <section className={first ? "" : "mt-5 border-t border-dashed border-slate-300/70 pt-5"}>
      <div className={`flex items-center justify-between gap-3 ${children ? "mb-3" : ""}`}>
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-brand-primary)]">{icon}</span>
          {title}
        </h3>
        {trailing}
      </div>
      {children}
    </section>
  );
}

// 统一的选项按钮：参与主体 / 每人评价数量共用同一套尺寸、间距与激活样式，保证整组 tab 视觉一致
function OptionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold leading-none transition ${
        active
          ? "border-[var(--color-brand-primary)] bg-blue-50 text-[var(--color-brand-primary)]"
          : "border-slate-200 bg-white/60 text-slate-500 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function PlanChip({ index, title }: { index: number; title: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[var(--color-brand-primary)]">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-xs font-black text-white">{index}</span>
      {title}
    </span>
  );
}

function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="mb-4 block last:mb-0">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
        <span className="flex items-center gap-2">{label}</span>
        <span className="text-blue-600">{value.toFixed(1)}x</span>
      </div>
      <input type="range" min={0.8} max={1.5} step={0.1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-purple-500" />
    </label>
  );
}
