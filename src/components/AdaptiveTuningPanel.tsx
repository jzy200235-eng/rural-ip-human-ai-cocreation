import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { TuningParam } from "../types";
import { tuningPresets } from "../data/mockData";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

export interface TuningSnapshot {
  semantic: string;
  params: TuningParam[];
}

export function AdaptiveTuningPanel({
  compact = false,
  embedded = false,
  onChange,
}: {
  compact?: boolean;
  embedded?: boolean;
  // 向上汇报当前精调内容（语义描述 + 滑块变量数值），供生成卡片展示
  onChange?: (snapshot: TuningSnapshot) => void;
}) {
  const [semantic, setSemantic] = useState("");
  const [params, setParams] = useState<TuningParam[]>([]);
  const tight = compact || embedded;

  const handleSemanticChange = (value: string) => {
    setSemantic(value);
    onChange?.({ semantic: value, params });
  };

  const generate = () => {
    const key = semantic.trim() || "活泼";
    const nextParams = tuningPresets[key] ?? tuningPresets["活泼"];
    setSemantic(key);
    setParams(nextParams);
    onChange?.({ semantic: key, params: nextParams });
  };

  const updateParam = (id: string, value: number) => {
    setParams((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, value } : item));
      onChange?.({ semantic, params: next });
      return next;
    });
  };

  return (
    <Card
      className={cn(
        "w-[330px] border border-[var(--color-border-control)] p-5",
        compact && "w-[285px] p-4",
        // 统一为磨砂玻璃材质 + 品牌强调色淡紫发光边缘
        embedded && "adaptive-glow w-full rounded-2xl border-2 border-[var(--color-border-control)] p-3.5",
      )}
    >
      <h3 className={cn("mb-4 flex items-center gap-2 text-base font-bold text-[var(--color-text-default)]", tight && "mb-3 text-sm")}>
        <Sparkles size={tight ? 16 : 18} className="text-[var(--color-brand-accent)]" />
        自适应精调
      </h3>
      <Input
        value={semantic}
        onChange={(event) => handleSemanticChange(event.target.value)}
        placeholder="例如：让它更喜庆一些..."
        className={cn(
          "h-16 text-lg font-bold",
          tight && "h-12 text-sm",
          embedded && "h-10 text-xs",
        )}
      />
      {embedded ? (
        <button
          type="button"
          onClick={generate}
          /* 调浅背景以降低视觉层级：品牌强调色低浓度淡紫，替代原饱和渐变 */
          className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-brand-accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--color-brand-accent)_13%,white)] text-xs font-bold text-[var(--color-brand-accent)] transition hover:bg-[color-mix(in_srgb,var(--color-brand-accent)_20%,white)]"
        >
          生成自适应滑块
        </button>
      ) : (
        <Button variant="gradient" className={cn("mt-5 w-full rounded-xl", tight && "mt-3 h-10 text-sm")} onClick={generate}>
          生成自适应滑块
        </Button>
      )}
      {params.length > 0 ? (
        <div
          className={cn(
            "mt-5 border-t border-[var(--color-border-control)] pt-4",
            tight && "mt-3 pt-3",
          )}
        >
          {params.map((param) => (
            <div key={param.id} className={cn("mb-5 last:mb-0", tight && "mb-3")}>
              <div className="mb-2 flex justify-between text-sm font-bold text-[var(--color-text-default)]">
                <span>{param.label}</span>
                <span className="text-[var(--color-brand-accent)]">{param.value}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={param.value}
                onChange={(event) => updateParam(param.id, Number(event.target.value))}
                className="tuning-range w-full accent-[var(--color-brand-accent)]"
              />
              <div className={cn("mt-2 flex justify-between text-sm font-bold text-[var(--color-text-subtle)]", tight && "text-xs")}>
                <span>村民平均: {param.villagerAverage}</span>
                <span>游客平均: {param.touristAverage}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
