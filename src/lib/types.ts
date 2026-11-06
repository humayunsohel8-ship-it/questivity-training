export type UserRole = "learner" | "manager" | "admin";
export type ContentStatus = "draft" | "published" | "archived";
export type LessonKind = "article" | "video" | "pdf" | "quiz";
export type EnrollmentStatus = "assigned" | "in_progress" | "completed";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  job_title: string | null;
  role: UserRole;
  department_id: string | null;
  manager_id: string | null;
  joined_on: string | null;
  is_active: boolean;
  departments?: { name: string } | null;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description_md: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  cover_url: string | null;
  duration_minutes: number;
  is_mandatory: boolean;
  status: ContentStatus;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  kind: LessonKind;
  body_md: string;
  media_url: string | null;
  duration_minutes: number;
  position: number;
}

export interface QuizQuestionPublic {
  id: string;
  lesson_id: string;
  prompt: string;
  options: string[];
  position: number;
}

export interface QuizResult {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  pass_mark: number;
  results: {
    question_id: string;
    correct: boolean;
    given: number | null;
    explanation: string;
    correct_index?: number;
  }[];
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  path_id: string | null;
  status: EnrollmentStatus;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface KbArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body_md: string;
  category_id: string | null;
  tags: string[];
  status: ContentStatus;
  owner_team: string | null;
  review_due: string | null;
  views: number;
  updated_at: string;
}

export interface Citation {
  n: number;
  slug: string;
  title: string;
  heading: string | null;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  answered_from_kb: boolean | null;
  feedback: -1 | 1 | null;
  created_at?: string;
}
