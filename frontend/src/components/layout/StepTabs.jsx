import React from "react";
import Badge from "../ui/Badge";
import { IconCheckCircle } from "../icons/Icons";

export default function StepTabs({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center" aria-label="Progress">
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;
        const isClickable = isCompleted && onStepClick;

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => isClickable && onStepClick(idx)}
              disabled={!isClickable}
              className={`
                flex-1 flex items-center gap-3 text-left rounded-xl border-2 px-3 py-2.5 transition-all
                ${
                  isActive
                    ? "border-accent bg-accent/10"
                    : isCompleted
                    ? "border-accent/25 bg-accent/5"
                    : "border-border bg-surface"
                }
                ${isClickable ? "cursor-pointer hover:border-accent/50" : "cursor-default"}
              `}
            >
              <div className="relative w-8 h-8 shrink-0">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${
                      isCompleted
                        ? "bg-accent text-white"
                        : isActive
                        ? "border-2 border-accent bg-accent/15 text-accent"
                        : "bg-surface-2 text-muted"
                    }
                  `}
                >
                  {isCompleted ? (
                    <IconCheckCircle className="w-5 h-5" strokeWidth={2} />
                  ) : (
                    step.icon
                  )}
                </div>
                <span
                  className={`
                    absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold
                    flex items-center justify-center border border-border
                    ${isActive || isCompleted ? "bg-accent text-white" : "bg-surface text-muted"}
                  `}
                >
                  {idx + 1}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-bold leading-tight truncate ${
                    isActive ? "text-accent" : "text-ink"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted truncate">{step.subtitle}</p>
              </div>

              <div className="shrink-0">
                {isCompleted ? (
                  <Badge variant="error">Done</Badge>
                ) : isActive ? (
                  <Badge variant="error" dot>
                    Active
                  </Badge>
                ) : (
                  <Badge variant="gray">Waiting</Badge>
                )}
              </div>
            </button>

            {idx < steps.length - 1 && (
              <div className="flex items-center px-2 shrink-0">
                <div
                  className={`w-6 h-0 ${
                    isCompleted
                      ? "border-t-2 border-accent"
                      : "border-t-2 border-dashed border-border"
                  }`}
                />
                {isCompleted && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent -ml-0.5" />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
