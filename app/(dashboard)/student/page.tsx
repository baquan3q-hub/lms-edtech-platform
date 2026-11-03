import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { getStudentToday } from "@/lib/modules/learning/student-service";
import { PageState } from "@/components/shared/PageState";

function dueLabel(value:string|null) {
  return value?new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Ho_Chi_Minh"}).format(new Date(value)):"Không có hạn nộp";
}
async function TodayContent() {
  let data:Awaited<ReturnType<typeof getStudentToday>>;
  try { data=await getStudentToday(); }
  catch { return <PageState kind="error" title="Chưa tải được việc học hôm nay" description="Dữ liệu chưa sẵn sàng. Bạn có thể mở lại trang hoặc quay về lớp học để tiếp tục." action={<Link href="/student/classes" className="text-primary underline underline-offset-4">Đến lớp học</Link>} />; }
  if(!data.classes.length) return <PageState title="Bạn chưa được ghi danh vào lớp" description="Khi nhà trường hoàn tất phân lớp, học liệu và bài cần làm sẽ xuất hiện tại đây." />;
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
    <section aria-labelledby="tasks-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h2 id="tasks-heading" className="text-lg font-semibold">Việc cần làm</h2><p className="mt-1 text-sm text-muted-foreground">{data.pendingCount} bài chưa nộp trong các lớp của bạn</p></div>
        <Link href="/student/assignments" className="shrink-0 text-sm font-medium text-primary">Xem tất cả</Link>
      </div>
      {data.tasks.length?<ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {data.tasks.map(task=><li key={`${task.kind}:${task.id}`}><Link href={task.href} className="group flex items-center gap-4 p-5 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
          <div className="hidden rounded-xl bg-secondary p-3 text-primary sm:block"><BookOpen className="size-5" aria-hidden="true" /></div>
          <div className="min-w-0 flex-1"><p className="text-xs font-medium text-muted-foreground">{task.className} · {task.kind==="exam"?"Bài kiểm tra":"Bài tập"}</p>
            <h3 className="mt-1 break-words font-medium text-foreground group-hover:text-primary">{task.title}</h3>
            <p className={`mt-2 flex items-center gap-1.5 text-xs ${task.overdue?"text-amber-700":"text-muted-foreground"}`}><Clock className="size-3.5" aria-hidden="true" />{task.overdue?"Đã qua hạn · ":"Hạn nộp · "}{dueLabel(task.dueAt)}</p></div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link></li>)}
      </ul>:<PageState title="Bạn đã hoàn thành các bài được giao" description="Hãy xem phản hồi của giáo viên hoặc mở lớp học để ôn lại nội dung." />}
      {data.hasMore&&<p className="text-sm text-muted-foreground">Trang này hiển thị các bài ưu tiên. Mở danh sách bài tập để xem đầy đủ.</p>}
    </section>
    <aside className="space-y-6">
      <section aria-labelledby="classes-heading" className="rounded-2xl border border-border bg-card p-5">
        <h2 id="classes-heading" className="flex items-center gap-2 font-semibold"><BookOpen className="size-4 text-primary" aria-hidden="true" />Lớp học của bạn</h2>
        <ul className="mt-3 divide-y divide-border">{data.classes.map(cls=><li key={cls.id}><Link className="flex min-h-12 items-center justify-between gap-3 py-3 text-sm hover:text-primary" href={`/student/classes/${cls.id}`}><span>{cls.name||"Lớp học"}</span><ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link></li>)}</ul>
      </section>
      <section aria-labelledby="feedback-heading" className="rounded-2xl border border-border bg-card p-5">
        <h2 id="feedback-heading" className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />Kết quả đã công bố</h2>
        {data.feedback.length?<ul className="mt-3 space-y-3">{data.feedback.map(item=><li key={`${item.kind}:${item.id}`}><Link href={item.href} className="block rounded-lg bg-secondary/60 p-3 text-sm hover:text-primary"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.className} · Xem điểm và phản hồi</p></Link></li>)}</ul>:<p className="mt-3 text-sm leading-6 text-muted-foreground">Kết quả sẽ hiển thị khi giáo viên công bố.</p>}
      </section>
      <Link href="/student/schedule" className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 text-sm font-medium"><span className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" aria-hidden="true" />Xem lịch học</span><ArrowRight className="size-4" aria-hidden="true" /></Link>
    </aside>
  </div>;
}
export default function StudentDashboardPage() {
  return <div className="mx-auto max-w-6xl space-y-8 pb-8">
    <header className="border-b border-border pb-6"><p className="text-sm font-medium text-muted-foreground">Không gian học tập</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Hôm nay</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Bắt đầu với bài gần hạn, tiếp tục học theo lớp và xem phản hồi để biết mình cần cải thiện điều gì.</p></header>
    <Suspense fallback={<div role="status" aria-label="Đang tải việc học" className="h-72 animate-pulse rounded-2xl border border-border bg-secondary" />}><TodayContent /></Suspense>
  </div>;
}
