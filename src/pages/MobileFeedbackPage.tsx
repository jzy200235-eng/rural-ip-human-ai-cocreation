import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Clock3, Mic, Sparkles, UserRound } from "lucide-react";
import { defaultFeedbackConfig, type FeedbackConfig } from "../lib/mobileFeedbackConfig";

const identityOptions = ["当地商户", "当地文化研究者", "村民", "手工艺人", "其他"];
const appearanceTags = ["人物", "动物", "植物", "地方建筑", "美食", "传统器物", "吉祥物"];
const styleTags = ["写实", "卡通风", "温暖手绘", "国潮", "质朴乡土", "现代简洁", "非遗纹样"];
const elementTags = ["老街屋檐", "酱鹅美食", "竹编纹理", "赶集场景", "田野稻浪", "乡音方言"];

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function polishText(text: string, topic: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return `AI 润色：围绕“${topic}”，可以表达为：我认为${trimmed.replace(/[。.!！?？]$/u, "")}，这些内容能帮助设计更准确地体现本地特色与大家的共同记忆。`;
}

export function MobileFeedbackPage() {
  return (
    <main className="flex min-h-[100dvh] items-start justify-center overflow-hidden bg-[#EFF6FF] px-0 py-0 text-slate-900 sm:items-center sm:px-4 sm:py-5">
      <MobileFeedbackSimulator />
    </main>
  );
}

export function MobileFeedbackSimulator({ config = defaultFeedbackConfig, previewMode = false }: { config?: FeedbackConfig; previewMode?: boolean }) {
  const [identities, setIdentities] = useState<string[]>(["村民"]);
  const [otherIdentity, setOtherIdentity] = useState("");
  const [appearance, setAppearance] = useState<string[]>(["动物"]);
  const [appearanceText, setAppearanceText] = useState("");
  const [styles, setStyles] = useState<string[]>(["卡通风", "温暖手绘"]);
  const [styleText, setStyleText] = useState("");
  const [elementText, setElementText] = useState("我觉得我们这里的老街屋檐、酱鹅和赶集的热闹场景最有代表性。");
  const [imageText, setImageText] = useState("");
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(
    () => [...config.dimensions, { key: "image" as const, title: "图片补充", hint: "补充照片能让设计更准确" }],
    [config.dimensions],
  );

  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[safeStepIndex] ?? steps[0];
  const progress = `${safeStepIndex + 1}/${steps.length}`;

  const summaries = useMemo(
    () => ({
      appearance: polishText(appearanceText || appearance.join("、"), "外观倾向"),
      style: polishText(styleText || styles.join("、"), "风格倾向"),
      element: polishText(elementText, "代表性元素"),
      image: polishText(imageText || uploadedImages.join("、"), "图片补充"),
    }),
    [appearance, appearanceText, elementText, imageText, styles, styleText, uploadedImages],
  );

  const currentText = currentStep.key === "appearance"
    ? appearanceText
    : currentStep.key === "style"
      ? styleText
      : currentStep.key === "element"
        ? elementText
        : currentStep.key === "image"
          ? imageText
          : customTexts[currentStep.key] ?? "";

  const currentSummary = currentStep.key === "appearance" || currentStep.key === "style" || currentStep.key === "element" || currentStep.key === "image"
    ? summaries[currentStep.key]
    : polishText(customTexts[currentStep.key] ?? "", currentStep.title);

  const updateCurrentText = (value: string) => {
    if (currentStep.key === "appearance") setAppearanceText(value);
    else if (currentStep.key === "style") setStyleText(value);
    else if (currentStep.key === "element") setElementText(value);
    else if (currentStep.key === "image") setImageText(value);
    else setCustomTexts((current) => ({ ...current, [currentStep.key]: value }));
  };

  const handleImageUpload = (event: { target: HTMLInputElement }) => {
    const names = Array.from(event.target.files ?? []).map((file) => file.name);
    if (names.length) setUploadedImages((current) => [...current, ...names]);
  };

  const goNext = () => {
    if (safeStepIndex === steps.length - 1) {
      setSubmitted(true);
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBack = () => setStepIndex((current) => Math.max(0, current - 1));

  if (!started) {
    return (
      <div className={previewMode ? "h-[852px] w-[393px] shrink-0 overflow-hidden rounded-[34px] bg-gradient-to-b from-white to-[#F6FAFF] shadow-[0_28px_90px_rgba(49,95,232,0.18)] ring-1 ring-blue-100/80" : "h-[100dvh] w-full max-w-[393px] shrink-0 overflow-hidden bg-gradient-to-b from-white to-[#F6FAFF] shadow-[0_28px_90px_rgba(49,95,232,0.18)] ring-1 ring-blue-100/80 sm:h-[852px] sm:w-[393px] sm:rounded-[34px]"}>
        <header className="relative flex h-full items-center overflow-hidden bg-gradient-to-br from-[#DCEAFF] via-white to-[#F5EEFF] px-6 py-8">
          <div className="absolute -right-16 -top-16 size-40 rounded-full bg-blue-300/30 blur-3xl" />
          <div className="absolute -bottom-16 left-8 size-36 rounded-full bg-violet-300/24 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/68 px-3 py-1.5 text-xs font-black text-[#315FE8] shadow-sm">
              <Clock3 size={14} /> 预计 10 分钟以内
            </div>
            <h1 className="mt-5 text-[28px] font-black leading-tight tracking-tight text-slate-950">{config.projectName}</h1>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
              这是一次面向本地利益相关者的意见征集流程。欢迎分享你熟悉的乡村记忆、代表元素和审美偏好，帮助我们一起共创更有地方味道的公共 IP。
            </p>
            <button type="button" onClick={() => setStarted(true)} className="mt-10 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#315FE8] to-[#8F6DE8] px-5 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(49,95,232,0.28)]">
              开始填写 <ArrowRight size={18} />
            </button>
          </div>
        </header>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={previewMode ? "flex h-[852px] w-[393px] shrink-0 items-center justify-center overflow-hidden rounded-[34px] bg-gradient-to-br from-white via-[#F6FAFF] to-[#EEF5FF] px-6 text-center shadow-[0_28px_90px_rgba(49,95,232,0.18)] ring-1 ring-blue-100/80" : "flex h-[100dvh] w-full max-w-[393px] shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-white via-[#F6FAFF] to-[#EEF5FF] px-6 text-center shadow-[0_28px_90px_rgba(49,95,232,0.18)] ring-1 ring-blue-100/80 sm:h-[852px] sm:w-[393px] sm:rounded-[34px]"}>
        <div>
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <CheckCircle2 size={34} />
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-950">已收到你的意见</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">感谢参与乡村公共 IP 共创，你的表达会被整理为设计参考方向。</p>
        </div>
      </div>
    );
  }

  return (
    <div className={previewMode ? "flex h-[852px] w-[393px] shrink-0 flex-col overflow-hidden rounded-[34px] bg-gradient-to-b from-white to-[#F6FAFF] shadow-[0_28px_90px_rgba(49,95,232,0.18)] ring-1 ring-blue-100/80" : "flex h-[100dvh] w-full max-w-[393px] shrink-0 flex-col overflow-hidden bg-gradient-to-b from-white to-[#F6FAFF] shadow-[0_28px_90px_rgba(49,95,232,0.18)] ring-1 ring-blue-100/80 sm:h-[852px] sm:w-[393px] sm:rounded-[34px]"}>
      <div className="bg-gradient-to-br from-[#DCEAFF] via-white to-[#F5EEFF] px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <button type="button" aria-label="上一步" onClick={goBack} disabled={stepIndex === 0} className="rounded-full bg-white/60 p-2 text-slate-500 disabled:opacity-30">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <div className="text-xs font-black text-[#315FE8]">{config.projectName} · {progress}</div>
            <div className="mt-1 text-lg font-black text-slate-950">{currentStep.title}</div>
          </div>
          <button type="button" aria-label={safeStepIndex === steps.length - 1 ? "提交意见" : "下一步"} onClick={goNext} className="rounded-full bg-white/60 p-2 text-slate-500 transition hover:bg-white/75">
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/70">
          <div className="h-full rounded-full bg-gradient-to-r from-[#315FE8] to-[#8F6DE8] transition-all" style={{ width: `${((safeStepIndex + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      {currentStep.key === "identity" ? (
        <section className="flex flex-1 flex-col px-4 py-5">
          <div className="rounded-[28px] bg-white p-4 shadow-[0_16px_44px_rgba(33,62,122,0.08)] ring-1 ring-blue-50">
            <div className="flex items-center gap-2 text-base font-black"><UserRound size={18} className="text-[#315FE8]" />你的身份</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">可多选，便于后续理解你的意见视角。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {identityOptions.map((identity) => {
                const active = identities.includes(identity);
                return (
                  <button key={identity} type="button" onClick={() => setIdentities((current) => toggleValue(current, identity))} className={`rounded-full px-3.5 py-2 text-sm font-black transition ${active ? "bg-[#315FE8] text-white shadow-[0_10px_24px_rgba(49,95,232,0.22)]" : "bg-slate-100 text-slate-600"}`}>
                    {identity}
                  </button>
                );
              })}
            </div>
            {identities.includes("其他") ? (
              <input value={otherIdentity} onChange={(event) => setOtherIdentity(event.target.value)} placeholder="请填写具体身份" className="mt-3 w-full rounded-2xl border border-blue-100 bg-blue-50/45 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-300" />
            ) : null}
          </div>

        </section>
      ) : (
        <DialogueStep
          stepKey={currentStep.key}
          title={currentStep.title}
          hint={currentStep.hint}
          tags={currentStep.key === "appearance" ? appearanceTags : currentStep.key === "style" ? styleTags : currentStep.key === "element" ? elementTags : []}
          selectedTags={currentStep.key === "appearance" ? appearance : currentStep.key === "style" ? styles : []}
          onToggleTag={(tag) => {
            if (currentStep.key === "appearance") setAppearance((current) => toggleValue(current, tag));
            if (currentStep.key === "style") setStyles((current) => toggleValue(current, tag));
            if (currentStep.key === "element") setElementText((current) => current.includes(tag) ? current : `${current}${current ? "、" : ""}${tag}`);
          }}
          text={currentText}
          onTextChange={updateCurrentText}
          summary={currentSummary}
          uploadedImages={uploadedImages}
          onImageUpload={handleImageUpload}
          onVoiceInput={() => {
            const voiceText = currentStep.key === "image" ? "语音转文字：我想补充几张老街和美食照片，帮助说明我们这里的生活气息。" : `语音转文字：我觉得${currentStep.hint}，希望设计能更亲切、更有本地味道。`;
            updateCurrentText(`${currentText ? `${currentText}\n` : ""}${voiceText}`);
          }}
        />
      )}
    </div>
  );
}

function DialogueStep({
  stepKey,
  title,
  hint,
  tags,
  selectedTags,
  onToggleTag,
  text,
  onTextChange,
  summary,
  uploadedImages,
  onImageUpload,
  onVoiceInput,
}: {
  stepKey: string;
  title: string;
  hint: string;
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  text: string;
  onTextChange: (value: string) => void;
  summary: string;
  uploadedImages: string[];
  onImageUpload: (event: { target: HTMLInputElement }) => void;
  onVoiceInput: () => void;
}) {
  const [isListening, setIsListening] = useState(false);

  const handleVoiceInput = () => {
    setIsListening(true);
    onVoiceInput();
    window.setTimeout(() => setIsListening(false), 900);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="rounded-[28px] bg-white p-4 shadow-[0_16px_44px_rgba(33,62,122,0.08)] ring-1 ring-blue-50">
          <div className="flex items-center gap-2 text-base font-black">
            {stepKey === "image" ? <Camera size={18} className="text-[#315FE8]" /> : <Sparkles size={18} className="text-[#315FE8]" />}{title}
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{hint}</p>
          {tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button key={tag} type="button" onClick={() => onToggleTag(tag)} className={`rounded-full px-3.5 py-2 text-sm font-black transition ${active ? "bg-[#E7F0FF] text-[#315FE8] ring-1 ring-blue-200" : "bg-slate-100 text-slate-600"}`}>
                    {tag}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {summary ? (
          <div className="mt-4 rounded-[24px] bg-gradient-to-r from-[#EEF5FF] to-[#F7F0FF] p-4 text-sm font-bold leading-6 text-slate-700 ring-1 ring-white">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-black text-[#315FE8]"><Sparkles size={14} /> AI 实时润色</div>
            {summary}
          </div>
        ) : null}

        {text.trim() ? (
          <div className="mt-4 rounded-[24px] bg-[#315FE8] px-4 py-3 text-sm font-semibold leading-6 text-white shadow-[0_16px_36px_rgba(49,95,232,0.20)]">
            {text}
          </div>
        ) : (
          <div className="mt-4 rounded-[24px] border border-dashed border-blue-200 bg-blue-50/45 px-4 py-6 text-center text-sm font-bold leading-6 text-slate-500">
            在下方输入你的想法，AI 会实时帮你整理表达。
          </div>
        )}

        {uploadedImages.length ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {uploadedImages.map((name, index) => (
              <div key={`${name}-${index}`} className="rounded-2xl bg-white px-3 py-3 text-xs font-bold leading-5 text-slate-600 ring-1 ring-blue-50">
                图片 {index + 1}<br />{name}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="z-10 shrink-0 border-t border-blue-100 bg-white/92 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="flex h-[64px] items-center gap-2 rounded-full bg-slate-100 p-2 ring-1 ring-slate-200/70">
          <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-[#315FE8] shadow-sm transition active:scale-95">
            <Camera size={18} />
            <input type="file" multiple accept="image/*" className="hidden" onChange={onImageUpload} />
          </label>
          <div className="h-7 w-px shrink-0 bg-slate-300" />
          <input value={text} onChange={(event) => onTextChange(event.target.value)} placeholder="输入你的想法" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400" />
          <button type="button" onClick={handleVoiceInput} className={`relative flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-rose-500 shadow-[0_10px_24px_rgba(244,63,94,0.18)] transition-all duration-300 active:scale-95 ${isListening ? "scale-105 ring-4 ring-rose-100" : "hover:scale-105"}`} aria-label={isListening ? "正在语音输入" : "语音输入"}>
            {isListening ? <span className="absolute inset-0 rounded-full bg-rose-50 animate-ping" /> : null}
            <Mic size={19} className="relative z-10 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </section>
  );
}
