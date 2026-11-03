import type { ReactNode } from "react";
import { BookOpen, AlertCircle } from "lucide-react";

export function PageState({ title,description,kind="empty",action }: {title:string;description:string;kind?:"empty"|"error";action?:ReactNode}) {
  const Icon=kind==="error"?AlertCircle:BookOpen;
  return <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10" role={kind==="error"?"alert":undefined}>
    <Icon className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    {action&&<div className="mt-5">{action}</div>}
  </div>;
}
