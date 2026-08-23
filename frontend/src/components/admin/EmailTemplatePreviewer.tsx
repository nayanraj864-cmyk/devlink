import React, { useState, useEffect, useCallback } from "react";
import { Mail, Eye, FileText, Send, CheckCircle2, AlertCircle } from "lucide-react";
import {
  listEmailTemplates,
  renderEmailTemplate,
  EmailTemplateInfo,
  EmailRenderResponse,
  EmailTemplateType,
} from "../../api/modules/emailTemplates";

export const EmailTemplatePreviewer: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateInfo[]>([]);
  const [selectedType, setSelectedType] = useState<EmailTemplateType>("welcome");
  const [viewMode, setViewMode] = useState<"html" | "text">("html");
  const [renderData, setRenderData] = useState<EmailRenderResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const list = await listEmailTemplates();
        setTemplates(list);
        if (list.length > 0) {
          setSelectedType(list[0].template_type);
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        setError(errorObj?.message || "Failed to load email templates.");
      }
    };
    fetchList();
  }, []);

  const handleRender = useCallback(async (tType: EmailTemplateType) => {
    setLoading(true);
    setError(null);
    try {
      const res = await renderEmailTemplate(tType);
      setRenderData(res);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message || "Failed to render email template.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedType) {
      handleRender(selectedType);
    }
  }, [selectedType, handleRender]);

  const currentInfo = templates.find((t) => t.template_type === selectedType);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-6 text-slate-900 dark:text-slate-100 backdrop-blur-md shadow-sm dark:shadow-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
            Email Notification Template Library
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Standardized transactional HTML email templates with plain-text fallback for DevLink.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode("html")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              viewMode === "html"
                ? "bg-cyan-500 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> HTML Preview
          </button>
          <button
            onClick={() => setViewMode("text")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              viewMode === "text"
                ? "bg-cyan-500 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Plain-Text Fallback
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Template Selection */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            Available Templates ({templates.length})
          </h3>

          <div className="space-y-2">
            {templates.map((tpl) => (
              <button
                key={tpl.template_type}
                onClick={() => setSelectedType(tpl.template_type)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  selectedType === tpl.template_type
                    ? "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-950 dark:text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{tpl.name}</span>
                  {selectedType === tpl.template_type && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {tpl.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Main Pane - Preview */}
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {currentInfo && renderData && (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              {/* Subject Line Header */}
              <div className="space-y-1 pb-3 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
                  Subject Line
                </span>
                <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                  {renderData.subject}
                </p>
              </div>

              {/* Live Preview Display */}
              {viewMode === "html" ? (
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white">
                  <iframe
                    title="Email HTML Preview"
                    srcDoc={renderData.html_content}
                    className="w-full h-[450px] border-none"
                  />
                </div>
              ) : (
                <div className="p-4 bg-slate-900 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[450px] overflow-y-auto">
                  {renderData.text_content}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
