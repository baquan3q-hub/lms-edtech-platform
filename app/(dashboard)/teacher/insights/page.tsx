import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeachingClasses,getClassAnalytics } from "@/lib/modules/analytics/service";
import { PageState } from "@/components/shared/PageState";

const percent=(value:number|null)=>value===null?"Chưa đủ dữ liệu":`${value}%`;
const signalLabel:Record<string,string>={unexcused_absences:"Số buổi vắng không phép",published_score_average:"Điểm trung bình đã công bố"};
async function ClassReport({classId,page}:{classId:string;page:number}) {
  let report:Awaited<ReturnType<typeof getClassAnalytics>>;
  try { report=await getClassAnalytics(classId,page); }
  catch { return <PageState kind="error" title="Chưa tải được báo cáo" description="Hãy kiểm tra kết nối hoặc mở lại trang sau. Dữ liệu học tập gốc vẫn được giữ nguyên." />; }
  if(!report.items.length)return <PageState title="Chưa có dữ liệu tổng hợp" description="Báo cáo xuất hiện sau khi học sinh được ghi danh và tác vụ tổng hợp cập nhật. Việc học, nộp và chấm bài vẫn hoạt động bình thường." />;
  const stale=report.items.some(row=>row.isStale);
  return <section className="space-y-4" aria-label="Báo cáo hỗ trợ học sinh">
    {stale&&<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Một số số liệu đang chờ cập nhật quá 5 phút. Hãy kiểm tra dữ liệu gốc trước khi đưa ra quyết định.</p>}
    <p className="text-sm text-muted-foreground">Hiển thị {page*20+1}–{Math.min((page+1)*20,report.total)} / {report.total} học sinh · Ưu tiên các tín hiệu cần xem xét</p>
    <ul className="space-y-4">{report.items.map(row=><li key={row.student_id} className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{row.studentName}</h2><span className={`rounded-full px-3 py-1 text-xs font-medium ${row.metrics.support_signals.length?"bg-amber-50 text-amber-800":"bg-secondary text-muted-foreground"}`}>{row.metrics.support_signals.length?"Cần xem xét hỗ trợ":row.metrics.data_status==="insufficient_data"?"Chưa đủ dữ liệu":"Chưa có tín hiệu vượt ngưỡng"}</span></div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div><dt className="text-xs text-muted-foreground">Hoàn thành bài tập</dt><dd className="mt-1 text-sm font-medium">{percent(row.metrics.homework_completion_rate)} <span className="font-normal text-muted-foreground">({row.metrics.homework_submitted}/{row.metrics.homework_assigned})</span></dd></div>
        <div><dt className="text-xs text-muted-foreground">Điểm đã công bố</dt><dd className="mt-1 text-sm font-medium">{row.metrics.published_score_average===null?"Chưa đủ dữ liệu":`${row.metrics.published_score_average}/10`} <span className="font-normal text-muted-foreground">· {row.metrics.published_score_count} bài</span></dd></div>
        <div><dt className="text-xs text-muted-foreground">Nộp bài đúng hạn</dt><dd className="mt-1 text-sm font-medium">{percent(row.metrics.homework_on_time_rate)}</dd></div>
      </dl>
      {row.metrics.support_signals.length>0&&<div className="mt-4 border-t border-border pt-4"><h3 className="text-sm font-medium">Bằng chứng cần trao đổi</h3><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{row.metrics.support_signals.map(signal=><li key={signal.rule}>{signalLabel[signal.rule]||signal.rule}: {signal.observed}{signal.sample_size?` · ${signal.sample_size} bài đã công bố`:""}</li>)}</ul><Link className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4" href={`/teacher/classes/${classId}/students`}>Mở hồ sơ lớp để xem dữ liệu gốc</Link></div>}
      {row.metrics.data_quality==="review_required"&&<p className="mt-3 text-sm text-amber-800">Cần đối soát số liệu giao bài và bài nộp.</p>}
      <p className="mt-4 text-xs text-muted-foreground">Cập nhật {new Date(row.computed_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})} · Quy tắc {row.rules_version}</p>
    </li>)}</ul>
    <nav aria-label="Phân trang báo cáo" className="flex items-center justify-between text-sm font-medium text-primary">
      {page>0?<Link href={`?classId=${classId}&page=${page-1}`} className="py-3">Trang trước</Link>:<span/>}
      {(page+1)*20<report.total&&<Link href={`?classId=${classId}&page=${page+1}`} className="py-3">Trang sau</Link>}
    </nav>
  </section>;
}
export default async function TeacherInsightsPage({searchParams}:{searchParams:Promise<{classId?:string;page?:string}>}) {
  const params=await searchParams;
  const classes=await getTeachingClasses();
  const selected=params.classId||classes[0]?.id;
  if(params.classId&&!classes.some(c=>c.id===params.classId))notFound();
  const page=Number(params.page||0);if(!Number.isInteger(page)||page<0||page>1000)notFound();
  return <div className="mx-auto max-w-5xl space-y-6 pb-8">
    <header><p className="text-sm font-medium text-muted-foreground">Dạy học và phối hợp hỗ trợ</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Hỗ trợ học sinh</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Xem tình hình hoàn thành bài và kết quả đã công bố. Các tín hiệu giúp giáo viên chọn việc cần trao đổi, kèm theo bằng chứng cụ thể.</p></header>
    {!selected?<PageState title="Chưa có lớp được phân công" description="Danh sách lớp và báo cáo sẽ xuất hiện khi nhà trường hoàn tất phân công." />:<>
      <form className="flex flex-wrap items-end gap-3" method="get"><div><label htmlFor="insight-class" className="mb-2 block text-sm font-medium">Lớp học</label><select id="insight-class" name="classId" defaultValue={selected} className="min-h-11 max-w-full rounded-xl border border-border bg-card px-3 text-sm">{classes.map(c=><option key={c.id} value={c.id}>{c.name||"Lớp học"}</option>)}</select></div><button className="min-h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground" type="submit">Xem báo cáo</button></form>
      <ClassReport classId={selected} page={page}/>
    </>}
  </div>;
}
