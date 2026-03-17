import { useState, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import { HelpCircle, ArrowRight, RotateCcw, ChevronRight } from "lucide-react";
import { Link } from "wouter";

type Node = {
  id?: string;
  question?: string;
  options?: { label: string; next?: Node; result?: string }[];
  result?: string;
};

export default function Troubleshooter() {
  const [treeData, setTreeData] = useState<Node | null>(null);
  const [path, setPath] = useState<{ node: Node; selection?: string }[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/tree.json`)
      .then(res => res.json())
      .then((data: Node) => {
        setTreeData(data);
        setPath([{ node: data }]);
      })
      .catch(err => console.error("Failed to load troubleshooter tree:", err));
  }, []);

  if (!treeData || path.length === 0) {
    return (
      <PageTransition className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </PageTransition>
    );
  }

  const currentNode = path[path.length - 1].node;

  const handleSelect = (option: { label: string; next?: Node; result?: string }) => {
    const newPath = [...path];
    newPath[newPath.length - 1].selection = option.label;

    if (option.next) {
      newPath.push({ node: option.next });
    } else if (option.result) {
      newPath.push({ node: { result: option.result } });
    }
    setPath(newPath);
  };

  const handleReset = () => {
    setPath([{ node: treeData }]);
  };

  return (
    <PageTransition className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-primary rounded-2xl mb-6">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4">Предварительная оценка</h1>
        <p className="text-slate-600">Ответьте на несколько вопросов, чтобы мы сориентировали вас по ремонту.</p>
      </div>

      <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
        {path.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 mb-8 text-sm text-slate-500">
            <button onClick={handleReset} className="hover:text-primary">Начало</button>
            {path.slice(0, -1).map((step, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium text-slate-800">{step.selection}</span>
              </div>
            ))}
          </div>
        )}

        <div className="min-h-[200px] flex flex-col justify-center">
          {currentNode.question && (
            <>
              <h2 className="text-2xl font-bold mb-8 text-slate-900">{currentNode.question}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentNode.options?.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(opt)}
                    className="flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-primary hover:bg-primary/5 transition-all text-left font-medium text-lg text-slate-700 hover:text-primary group"
                  >
                    {opt.label}
                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>
            </>
          )}

          {currentNode.result && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl border border-emerald-100 mb-8 font-medium text-lg">
                {currentNode.result}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/booking/new"
                  className="px-8 py-3 bg-primary text-white rounded-xl font-medium shadow-lg hover:bg-primary/90 transition-all"
                >
                  Оформить заявку
                </Link>
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> Начать заново
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
