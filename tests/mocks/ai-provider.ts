/** Test fixtures only. Production never fabricates successful provider responses. */
export function aiFixture(prompt: string) {
  const output = prompt.includes("[TIÊU CHÍ RUBRIC]") ? {
    criteria_feedback:[{criterion_id:"c1",criterion_name:"Lập luận",suggested_score:4,max_score:5,evidence_quote:"x = 5",feedback_text:"Các bước giải được trình bày rõ ràng."}],
    overall_feedback:{strengths:"Lập luận rõ ràng và có căn cứ.",areas_for_improvement:"Bổ sung điều kiện xác định.",next_steps:"Luyện thêm một bài cùng chủ đề."},
  } : prompt.includes("[DỮ LIỆU HỌC TẬP]") ? {
    risk_level:"medium",primary_concern:"academic",observed_patterns:"Có hai bài kiểm tra đã công bố dưới mức cần đạt.",
    recommended_actions:[{action_type:"academic_tutoring",title:"Ôn tập chủ đề còn thiếu",description:"Giáo viên xem bài làm và cùng học sinh ôn lại chủ đề.",target_timeline_days:7}],
    parent_communication_draft:"Kính gửi phụ huynh, giáo viên đề nghị cùng phối hợp hỗ trợ việc ôn tập của học sinh.",
  } : {
    subject:"Toán",grade_level:12,topic:"Đạo hàm",
    questions:[{id:"q1",question_text:"Đạo hàm của hàm số y = x² tại x = 2 bằng bao nhiêu?",question_type:"multiple_choice",
      options:[{id:"A",text:"Bốn"},{id:"B",text:"Hai"},{id:"C",text:"Sáu"},{id:"D",text:"Tám"}],correct_answer:"A",explanation:"Ta có y' = 2x, thay x = 2 được 4.",difficulty:"easy",points:1}],
  };
  return {text:JSON.stringify(output),usageMetadata:{totalTokenCount:123}};
}
