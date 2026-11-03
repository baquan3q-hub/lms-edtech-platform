import { describe,it,expect } from "vitest";
import { toStudentExam,toStudentSubmission } from "@/lib/modules/assessment/dto";
import { toStudentHomework,toStudentHomeworkSubmission } from "@/lib/modules/assessment/homework-dto";
import { toStudentCourseItem } from "@/lib/modules/learning/content-dto";

const questions=[{id:"q1",question:"2 + 2 bằng bao nhiêu?",points:10,options:[{id:"a",text:"4",isCorrect:true},{id:"b",text:"5",isCorrect:false}]}];
const exam={id:"exam",class_id:"class",title:"Kiểm tra",total_points:10,duration_minutes:30,show_answers:true,
  questions_snapshot:{questions},ai_rubric_draft:{secret:true},created_by:"teacher"};
describe("Student serialization boundaries",()=>{
  it("strips embedded answer keys from learning content",()=>{
    const dto=toStudentCourseItem({id:"i",class_id:"c",parent_id:null,title:"Quiz",type:"quiz",order_index:0,is_published:true,
      private_snapshot:questions,content:{item_id:"i",content:"Lesson",quiz_data:questions}});
    expect(JSON.stringify(dto)).not.toMatch(/isCorrect|quiz_data|private_snapshot/);
    expect(dto.content).toEqual({item_id:"i",content:"Lesson"});
  });
  it("does not serialize answer keys through snapshots or future unknown database columns",()=>{
    const dto=toStudentExam(exam,questions);
    expect(JSON.stringify(dto)).not.toMatch(/isCorrect|questions_snapshot|ai_rubric|created_by/);
    expect(dto.questions[0].options[0]).toEqual({id:"a",text:"4"});
  });
  it("reveals answers only when publication and the exam reveal setting both permit it",()=>{
    expect(toStudentExam(exam,questions,true).questions[0].options[0]).toHaveProperty("isCorrect",true);
    expect(JSON.stringify(toStudentExam({...exam,show_answers:false},questions,true))).not.toContain("isCorrect");
  });
  it.each(["draft","ungraded","pending","graded",null,undefined])("keeps unpublished score state %s private",grading_status=>{
    const dto=toStudentSubmission({id:"sub",answers:[],score:9,feedback:"private",grading_status,objective_score:8,rubric_grades:{score:9},attempt_history:[{score:10}],snapshot:exam});
    expect(dto.score).toBeNull();expect(dto.feedback).toBeNull();
    expect(dto).not.toHaveProperty("attempt_history");expect(dto).not.toHaveProperty("snapshot");
    expect(dto).not.toHaveProperty("objective_score");expect(dto).not.toHaveProperty("rubric_grades");
  });
  it.each(["published","locked"])("shows published score state %s",grading_status=>{
    expect(toStudentSubmission({id:"sub",score:0,feedback:"Đã chấm",grading_status}).score).toBe(0);
  });
  it("protects homework questions, historical scores and model drafts",()=>{
    const hw=toStudentHomework({...exam,questions:questions.map(q=>({...q,type:"multiple_choice"})),questions_snapshot:questions});
    expect(JSON.stringify(hw)).not.toMatch(/isCorrect|questions_snapshot/);
    const sub=toStudentHomeworkSubmission({id:"sub",homework_id:"hw",answers:[],grading_status:"draft",status:"graded",score:10,attempt_history:[{score:10}]});
    expect(sub.score).toBeNull();expect(sub).not.toHaveProperty("attempt_history");
  });
});
