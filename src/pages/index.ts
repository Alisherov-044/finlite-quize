import { lazy } from "react";

export const ExamPage = lazy(() => import("./exam"));
export const ExamsPage = lazy(() => import("./exams"));
export const GroupsPage = lazy(() => import("./groups"));
export const LoginPage = lazy(() => import("./login"));
export const PracticePage = lazy(() => import("./practice"));
export const StudentsPage = lazy(() => import("./students"));
export const TestsPage = lazy(() => import("./tests"));
export const MaterialsPage = lazy(() => import("./materials"));
export const ExamDetailsPage = lazy(() => import("./exam/[slug]"));
export const ExamsDetailsPage = lazy(() => import("./exams/[slug]"));
export const PracticeDetailsPage = lazy(() => import("./practice/[slug]"));
export const StudentDetailsPage = lazy(() => import("./students/[slug]"));
export const UnAuthorizedPage = lazy(() => import("./un-authorized"));
export const NotFoundPage = lazy(() => import("./not-found"));
