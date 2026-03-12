import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKnowledgeGap(gap: any): string {
  if (!gap) return "Kiến thức hổng";
  if (typeof gap === 'string') {
      if (gap.trim().startsWith('{')) {
          try {
              const parsed = JSON.parse(gap);
              if (parsed.tags && Array.isArray(parsed.tags) && parsed.tags.length > 0) {
                  return parsed.tags.join(', ');
              }
              if (parsed.question) return "Lỗi câu hỏi: " + (parsed.question.length > 30 ? parsed.question.substring(0, 30) + "..." : parsed.question);
              return "Kiến thức hổng";
          } catch (e) {
              return gap.length > 50 ? gap.substring(0, 50) + "..." : gap;
          }
      }
      return gap;
  }
  if (typeof gap === 'object') {
      if (gap.tags && Array.isArray(gap.tags) && gap.tags.length > 0) return gap.tags.join(', ');
      if (gap.question) return "Lỗi câu hỏi: " + (gap.question.length > 30 ? gap.question.substring(0, 30) + "..." : gap.question);
      return "Kiến thức hổng";
  }
  return String(gap);
}
