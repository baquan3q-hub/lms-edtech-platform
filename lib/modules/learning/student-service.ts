import "server-only";
import { z } from "zod";
import { requireSchoolActor } from "@/lib/auth/authorize";
const item=z.object({id:z.string(),title:z.string(),kind:z.enum(["exam","homework"]),className:z.string(),dueAt:z.string().nullable(),overdue:z.boolean(),href:z.string().startsWith("/student/classes/")});
const today=z.object({classes:z.array(z.object({id:z.string(),name:z.string().nullable()})),tasks:z.array(item),feedback:z.array(item),pendingCount:z.number().int().min(0),hasMore:z.boolean()});
export async function getStudentToday() {
  const actor=await requireSchoolActor(["student"]);
  const {data,error}=await actor.db.rpc("get_student_today",{p_student:actor.id,p_school:actor.schoolId});
  if(error)throw error;
  return today.parse(data);
}
