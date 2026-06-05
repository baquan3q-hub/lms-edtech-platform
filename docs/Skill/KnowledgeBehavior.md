# KnowledgeBehavior.md
# Intelligent LMS Platform — Conceptual Knowledge Map for AI Context
# Purpose: Describe what this system IS, what it KNOWS, what it OBSERVES, and what it DECIDES
# Audience: AI agent (antigravity) needing domain understanding before designing system flows and data models

---

## SECTION 0 — WHAT THIS SYSTEM IS

This is not a simple content-delivery platform.
This is an **intelligent learning ecosystem** that simultaneously acts as:

- A **learning environment** where knowledge is constructed, not just consumed
- A **behavioral observatory** that continuously observes how each learner interacts with content, time, and peers
- A **decision-support engine** that transforms raw behavioral signals into actionable insights for teachers, parents, and administrators
- A **communication bridge** that connects the school ecosystem: students ↔ teachers ↔ parents ↔ administrators

The system's core belief:
> Learning outcomes are not just a function of content quality — they are a function of engagement, self-regulation, timely feedback, parental involvement, and personalized pacing.

---

## SECTION 1 — WHO EXISTS IN THIS SYSTEM (Actors / Roles)

The system recognizes the following distinct actors, each with different **goals**, **permissions**, and **data visibility**:

### 1.1 STUDENT
- The primary **subject of observation and support**
- Consumes content, submits work, takes quizzes, interacts in discussions
- Has a **personal learning profile** that evolves over time
- Generates the most raw behavioral data in the system
- Can see their own: progress, scores, feedback, schedule, notifications
- Cannot see other students' full profiles (only leaderboard rankings)

### 1.2 TEACHER
- The primary **decision-maker and content owner**
- Creates courses, lessons, quizzes, homework, exams
- Observes student behavior and performance at individual and class level
- Receives AI-generated alerts and recommendations
- Provides feedback on student work
- Has authority to intervene: send messages, adjust deadlines, flag students

### 1.3 PARENT
- A **passive observer with active communication rights**
- Cannot change content or grades
- Can see their child's: attendance, progress, scores, behavior flags, schedule
- Can submit absence requests on behalf of their child
- Receives notifications when their child's performance drops or attendance is irregular
- Their level of engagement with the portal is itself a **tracked signal** in the system

### 1.4 ADMINISTRATOR / SCHOOL MANAGER
- Oversees the entire institution
- Has visibility across all classes, teachers, and students
- Manages enrollment, user accounts, academic calendar
- Uses aggregated analytics dashboards
- Can configure system-wide rules (notification thresholds, grading policies)

### 1.5 AI/ML LAYER (Non-human actor)
- Observes all behavioral data continuously
- Generates: risk scores, anomaly flags, knowledge gap maps, content recommendations, smart notifications
- Does NOT make final decisions — it **suggests** to human actors
- Is transparent: its recommendations are explainable, not black-box verdicts

---

## SECTION 2 — WHAT THE SYSTEM KNOWS (Core Data Entities)

The system maintains knowledge about the following entities.
Each entity is a **persistent record** that accumulates information over time.

### 2.1 LEARNER PROFILE
Each student has a profile that contains:
- Identity (name, grade, class, enrolled courses)
- Academic history (scores over time, completion rates, attendance record)
- Behavioral fingerprint (typical login time, session length, submission patterns)
- Skill map (which competencies are mastered, partially mastered, or missing)
- Risk indicators (current early warning score, anomaly flags if any)
- Gamification status (points, streaks, leaderboard rank, badges)
- Parent connection (linked parent account, parent engagement level)

This profile is **never static** — it updates with every interaction the student makes.

### 2.2 COURSE & CONTENT STRUCTURE
Content in this system is structured as a **tree, not a flat list**:
- A Course contains multiple Units
- A Unit contains multiple Lessons
- A Lesson can contain: video, text, file, embedded quiz, discussion prompt
- Lessons have **prerequisite relationships** — some lessons unlock only after others are completed
- Each lesson and quiz is tagged with **skill/competency labels** that connect to the student's skill map

This tree structure is important because it enables **mastery-based progression**:
the system knows not just "did the student finish?" but "did the student demonstrate understanding before moving forward?"

### 2.3 ASSESSMENT OBJECTS
The system distinguishes between different types of evaluation:

| Type | Purpose | When Used |
|---|---|---|
| **Quiz** | Quick knowledge check, formative | During or after a lesson |
| **Homework** | Practice and application | Between class sessions |
| **Exam** | Summative evaluation | End of unit/semester |
| **AI Feedback** | Personalized response to work | After submission, automated |
| **Teacher Feedback** | Human annotation on student work | Teacher-initiated |

Each assessment object produces a **score**, a **timestamp**, a **time-spent value**, and potentially **behavioral signals** (e.g., how fast answers were selected).

### 2.4 BEHAVIORAL EVENT LOG
This is the most granular data entity in the system.
Every meaningful action a student takes is recorded as a timestamped event:

```
Event types include (but are not limited to):
- LOGIN / LOGOUT
- LESSON_OPENED / LESSON_COMPLETED
- VIDEO_PLAYED / VIDEO_PAUSED / VIDEO_SKIPPED
- QUIZ_STARTED / QUIZ_SUBMITTED / QUIZ_ANSWER_SELECTED
- HOMEWORK_STARTED / HOMEWORK_SUBMITTED (with delay indicator)
- DISCUSSION_POST_CREATED / DISCUSSION_REPLY_CREATED
- NOTIFICATION_RECEIVED / NOTIFICATION_OPENED
- TAB_SWITCH_DETECTED (integrity signal)
- IDLE_PERIOD_DETECTED (engagement signal)
```

These events are **the raw material** for all analytics, ML models, and behavioral insights.

### 2.5 ATTENDANCE RECORD
Attendance is treated as a **multi-dimensional signal**, not just present/absent:
- Scheduled class time vs actual login time
- Duration of presence in online session
- Absence reasons (submitted by parent or student)
- Patterns over time (chronic lateness, specific-day absences, etc.)
- Teacher-marked vs system-auto-detected attendance

### 2.6 GAMIFICATION STATE
Each student has a live gamification state:
- **Points**: accumulated through completing lessons, submitting on time, attending class, participating in discussions
- **Streak**: consecutive days of learning activity (resets on inactivity)
- **Leaderboard rank**: relative to classmates (class-scoped, not global, to reduce unhealthy competition)
- **Badges/Achievements**: milestone markers (e.g., "Completed 10 lessons in a row", "Perfect attendance this month")

Gamification data is **behavioral motivation data**, not just decorative. Changes in streak or rank correlate with engagement level.

---

## SECTION 3 — WHAT THE SYSTEM OBSERVES (Behavioral Signals)

The system continuously extracts **behavioral features** from raw event logs.
These features are the vocabulary the AI uses to understand a student.

### 3.1 ENGAGEMENT SIGNALS
```
login_frequency_7d         → How many days in the last 7 days did the student log in?
avg_session_duration       → On average, how long does each session last?
content_completion_rate    → % of assigned lessons actually completed
discussion_participation   → Number of posts/replies in class discussions
notification_open_rate     → Does the student open notifications sent to them?
idle_time_ratio            → What % of session time is the student inactive?
```

### 3.2 PERFORMANCE SIGNALS
```
quiz_accuracy              → Average % of correct answers across all quizzes
score_trend                → Is the student's scores going up, stable, or declining?
score_variance             → Are scores consistent or wildly fluctuating?
homework_attempt_count     → Does the student try multiple times or give up?
submission_delay_mean      → On average, how many hours/days late are submissions?
late_count                 → Total number of late submissions in current period
```

### 3.3 INTEGRITY SIGNALS (anomaly detection inputs)
```
tab_switch_count           → Number of times student switched browser tabs during a quiz
rapid_guess_percent        → % of answers submitted faster than humanly possible for reading
time_vs_accuracy_ratio     → High accuracy with abnormally low time = suspicious
content_skip_rate          → Submitting quiz without opening lesson content
answer_pattern_entropy     → Unusually ordered or patterned answer sequences
```

### 3.4 SOCIAL & PARENTAL SIGNALS
```
parent_interaction_count   → How often does the parent check the portal?
parent_message_count       → How often does the parent communicate with teachers?
absence_request_frequency  → How many absences were formally requested by parent?
teacher_feedback_read_rate → Does the student open and read teacher feedback?
```

---

## SECTION 4 — WHAT THE SYSTEM DECIDES (Intelligence Layer)

The AI/ML layer transforms behavioral signals into decisions and recommendations.
These are described conceptually — what the system "thinks" and "communicates" to humans.

### 4.1 EARLY WARNING: Student at Risk
**What the system asks:** "Is this student likely to fall behind or disengage in the coming weeks?"

**What it looks at:**
Low login frequency + high submission delay + declining score trend + low completion rate + increasing absence = high risk signal

**What it produces:**
A weekly **risk score** per student (low / medium / high).

**Who receives this:**
Teacher gets an alert. Parent gets a notification (softer, non-alarming language). Administrator sees it on dashboard.

**What it does NOT do:**
It does not label the student. It does not share risk scores with the student. It prompts humans to act.

---

### 4.2 KNOWLEDGE GAP TRACING
**What the system asks:** "What specific skills or concepts has this student NOT yet mastered?"

**What it looks at:**
Sequence of correct/incorrect answers on questions tagged with specific skill labels.
It tracks **probability of mastery per skill** — not just "got it right once" but "demonstrates consistent understanding."

**What it produces:**
A personal **skill map** showing: mastered, partially understood, and unmastered competencies.

**Who receives this:**
Student sees a simplified version ("you're strong in X, need work in Y").
Teacher sees the full breakdown to know where to intervene.

**What it enables:**
The recommendation engine uses this map to suggest the right next content — not just "next in sequence" but "next that addresses your weakest skill."

---

### 4.3 ANOMALY DETECTION: Behavioral Integrity
**What the system asks:** "Is this student's behavior pattern consistent with genuine learning, or are there signals of gaming the system?"

**What it looks at:**
Tab switches + rapid answers + high scores despite low content engagement + abnormal timing patterns.

**What it produces:**
A **suspicion flag** — not a verdict. The system marks the activity for human review.

**Who receives this:**
Only the teacher sees these flags. The system presents evidence, not conclusions.
Example message to teacher: "Student submitted Quiz 3 in 47 seconds with 90% accuracy, but did not open the lesson content. Please review."

---

### 4.4 PERSONALIZED CONTENT RECOMMENDATION
**What the system asks:** "What should this student do next, given their current skill level, progress, and gaps?"

**What it looks at:**
Current position in course tree + skill map gaps + past quiz performance on related topics.

**What it produces:**
Ordered list of recommended next steps:
- "Continue with Lesson 4 (you're ready)"
- "Revisit Quiz 2 on [topic] — your accuracy was 40%"
- "Try Supplementary Exercise Set B — it targets your weakness in [skill]"

---

### 4.5 SMART NOTIFICATIONS
**What the system asks:** "When is the right time to send a reminder, and what kind of reminder will this student actually respond to?"

**What it learns over time:**
- Which students respond to deadline reminders vs. encouragement messages vs. progress summaries
- At what time of day does each student typically begin studying
- Which notification types lead to actual login within 2 hours

**What it produces:**
Dynamically timed and personalized push/email notifications instead of broadcast blasts.

---

### 4.6 STUDENT CLUSTERING (for teachers)
**What the system asks:** "What types of learners exist in this class, so the teacher can design appropriate interventions?"

**What it identifies:**
```
Cluster A: "Steady Learners"     → Consistent login, consistent scores, on-time submissions
Cluster B: "Deadline Cramers"    → Low engagement most of the week, spike before deadline
Cluster C: "Hard Workers, Low Output" → High time spent, high attempts, but low scores (need support)
Cluster D: "Passive High Scorers" → Low content interaction, high quiz accuracy (possibly already know material)
Cluster E: "Disengaged"          → Low on everything, at-risk
```

**Who receives this:**
Teacher dashboard shows class composition by cluster.
Teacher can filter students by cluster and send targeted messages or assign targeted supplementary work.

---

## SECTION 5 — THE PARENTAL LAYER (Unique Dimension)

Most LMS systems are a 2-party ecosystem: student ↔ teacher.
This system introduces a **third party with real informational rights**: the parent.

### What parents see:
- Their child's attendance record (live)
- Their child's current scores and submission status
- Their child's progress through the course tree
- Any behavioral flags or alerts (translated into parent-friendly language)
- Notifications when their child's performance drops or attendance is concerning

### What parents can do:
- Submit absence requests (which become attendance records)
- Send messages to teachers
- View the academic calendar and upcoming deadlines

### Why this matters for the system:
Parent engagement is itself a **tracked variable** in the ML models.
Research shows that students whose parents actively engage with school platforms tend to have better attendance and completion rates.
The system uses `parent_interaction_count` as a feature in the student risk model — because a student whose parent is not monitoring the portal is at slightly higher risk of going unnoticed when they disengage.

---

## SECTION 6 — THE LEARNING PHILOSOPHY ENCODED IN THE SYSTEM

This section explains the beliefs baked into how the system behaves — so AI designing features understands the "why" behind every design decision.

### Belief 1: Knowledge is constructed, not delivered
The system is not a video player or document repository.
Content is organized in a **tree with dependencies** because understanding builds on understanding.
Discussion features exist because social interaction deepens comprehension.
Feedback loops (AI and human) exist because reflection is part of learning.

### Belief 2: Learners need scaffolding, not just access
Simply giving students access to content is not enough.
The system provides: deadlines, reminders, progress visibility, streaks, and personalized next-step guidance.
These are not bureaucratic features — they are **scaffolds for self-regulation**.
A student who can see their own progress is more likely to self-correct than one who has no visibility.

### Belief 3: Assessment is for learning, not just measurement
Quizzes in this system are not just grading tools.
They generate data that feeds back into the student's skill map.
They trigger supplementary recommendations.
A wrong answer is not just a lost point — it is a **signal of a knowledge gap** that the system should address.

### Belief 4: Speed of feedback matters
A student who gets feedback 2 weeks after submitting work cannot adjust their behavior.
The AI feedback layer exists to provide **immediate, personalized responses** so the learning loop closes quickly.

### Belief 5: Motivation is engineered, not assumed
Students are not uniformly motivated.
The gamification layer (points, streaks, leaderboards) is not decoration — it is designed to support the three psychological needs identified by Self-Determination Theory:
- **Competence**: seeing your skill map improve
- **Autonomy**: choosing your learning path within the course tree
- **Relatedness**: seeing your rank among peers, receiving recognition

### Belief 6: Early intervention beats remediation
The most expensive educational problem is a student who falls behind unnoticed for months.
The early warning system exists to ensure **no student quietly disappears** from engagement without someone being notified.
The cost of a false positive alert (checking on a student who is actually fine) is much lower than the cost of missing a student who genuinely needs help.

---

## SECTION 7 — DATA LIFECYCLE SUMMARY

```
RAW EVENT
(student clicks, submits, logs in, is absent)
        ↓
EVENT LOG
(timestamped, labeled, stored per student)
        ↓
FEATURE EXTRACTION
(behavioral features aggregated over time windows: daily, weekly, per course)
        ↓
ML INFERENCE
(risk score, skill map update, anomaly flag, cluster assignment)
        ↓
ACTION GENERATION
(alert to teacher, notification to parent, recommendation to student, dashboard update)
        ↓
HUMAN DECISION
(teacher intervenes, parent follows up, student adjusts behavior)
        ↓
NEW BEHAVIOR
(feeds back into event log → continuous loop)
```

This is a **closed feedback loop**, not a one-way pipeline.
Human actions taken in response to AI alerts become new behavioral data that refines future model outputs.

---

## SECTION 8 — WHAT THE SYSTEM DOES NOT DO (Ethical Constraints)

Understanding system boundaries is as important as understanding capabilities.

- The system **does not make final academic judgments** about students. Humans do.
- The system **does not share risk scores or anomaly flags with students or parents** directly. Only teachers and administrators see raw signals.
- The system **does not rank students in a way that causes social harm** — leaderboards are class-scoped and participation-based, not punitive.
- The system **does not store behavioral data beyond its necessary retention period** — student data, especially for minors, is subject to strict privacy handling.
- The system **does not treat ML outputs as ground truth** — all recommendations include enough context for a teacher to disagree.
- The system **does not make the same prediction for all student groups without auditing for bias** — model fairness across demographic subgroups is a design requirement.

---

*End of KnowledgeBehavior.md*
*This document is a conceptual knowledge map intended for AI context ingestion.*
*It describes WHAT the system knows and does, not HOW it is technically implemented.*
