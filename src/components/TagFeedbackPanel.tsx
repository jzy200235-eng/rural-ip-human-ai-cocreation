import type { RoundResult } from "../types";
import { Card } from "./ui/card";

export function TagFeedbackPanel({ result }: { result: RoundResult }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-lg font-bold text-slate-700">高频标签</h3>
      <div className="space-y-4">
        {Object.entries(result.tagsByCandidate).map(([candidate, tags]) => (
          <div key={candidate}>
            <p className="mb-2 text-sm font-bold text-slate-600">{candidate}:</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag.label} className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                  {tag.label} ({tag.count})
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
