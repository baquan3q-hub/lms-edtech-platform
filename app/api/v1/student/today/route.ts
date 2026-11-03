import { api } from "@/lib/api/http";
import { getStudentToday } from "@/lib/modules/learning/student-service";
export async function GET() { return api(getStudentToday); }
