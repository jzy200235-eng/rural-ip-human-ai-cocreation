import { BarChart3 } from "lucide-react";
import type { RoundResult } from "../types";
import { Card } from "./ui/card";

export function VotingDistribution({ result }: { result: RoundResult }) {
  const max = Math.max(...result.distribution.map((item) => item.votes));
  return (
    <Card className="p-5">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-700">
        <BarChart3 className="text-slate-600" size={20} />
        投票分布
      </h3>
      <div className="space-y-4">
        {result.distribution.map((item) => (
          <div key={item.candidate}>
            <div className="mb-2 flex justify-between text-sm font-bold text-slate-600">
              <span>{item.candidate}</span>
              <span className="text-blue-600">{item.votes} 票</span>
            </div>
            <div className="h-3 rounded-full bg-blue-200">
              <div className="h-3 rounded-l-full bg-green-400" style={{ width: `${(item.votes / max) * 72}%` }} />
              <div className="-mt-3 ml-auto h-3 rounded-r-full bg-blue-400" style={{ width: `${Math.max(12, 100 - (item.votes / max) * 72)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
