import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

export function InfoTooltip({ description }: { description: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="ml-1 inline-flex items-center text-slate-400 hover:text-slate-200"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-slate-900/90 text-slate-200 border border-slate-700 px-3 py-2 text-xs leading-relaxed"
        >
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
