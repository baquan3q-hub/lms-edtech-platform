import "server-only";
import { z } from "zod";
import { requireActor,requireSchoolActor,requireClassAccess } from "@/lib/auth/authorize";

export async function getTeachingClasses() {
  const actor=await requireSchoolActor(["teacher","admin"]);
  const {data,error}=await actor.db.rpc("get_teaching_classes",{p_actor:actor.id,p_school:actor.schoolId});
  if(error)throw error;
  return z.array(z.object({id:z.string(),name:z.string().nullable()})).parse(data||[]);
}
const metricsSchema=z.object({
  homework_assigned:z.number(),homework_submitted:z.number(),homework_completion_rate:z.number().nullable(),homework_on_time_rate:z.number().nullable(),
  published_score_average:z.number().nullable(),published_score_count:z.number(),unexcused_absences:z.number(),
  support_signals:z.array(z.object({rule:z.string(),observed:z.number(),threshold:z.number(),sample_size:z.number().optional()})),
  data_status:z.enum(["available","insufficient_data"]),data_quality:z.enum(["valid","review_required"]),
});
const rowSchema=z.object({student_id:z.string(),metrics:metricsSchema,rules_version:z.string(),computed_at:z.string(),student:z.union([z.object({full_name:z.string()}),z.array(z.object({full_name:z.string()}))]).nullable()});
export async function getClassAnalytics(classId:string,page=0) {
  await requireActor(["teacher","admin"]);
  const actor=await requireClassAccess(z.uuid().parse(classId),"teach");
  z.number().int().min(0).max(1000).parse(page);
  const {data,error,count}=await actor.db.from("learning_metric_projections")
    .select("student_id,metrics,rules_version,computed_at,student:users!learning_metric_projections_student_id_fkey(full_name)",{count:"exact"})
    .eq("school_id",actor.schoolId).eq("class_id",classId).order("support_count",{ascending:false}).order("student_id").range(page*20,page*20+19);
  if(error)throw error;
  const items=z.array(rowSchema).parse(data||[]).map(row=>({...row,isStale:Date.now()-Date.parse(row.computed_at)>300000,studentName:(Array.isArray(row.student)?row.student[0]:row.student)?.full_name||"Học sinh"}));
  return {items,page,pageSize:20,total:count||0};
}
