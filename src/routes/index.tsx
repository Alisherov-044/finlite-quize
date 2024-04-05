import { LoginPageSkeleton } from "@/components";
import {
    ExamsPage,
    GroupsPage,
    LoginPage,
    MaterialsPage,
    NotFoundPage,
    PracticePage,
    RedirectionToRolePage,
    StudentsPage,
    TeachersPage,
    TestsPage,
    UnAuthorizedPage,
} from "@/pages";
import { Role } from "@/types";
import type { ReactNode } from "react";

export type TRoute = {
    id: number;
    path: string;
    element: ReactNode;
    fallback?: ReactNode;
};

export type TPublicRoute = TRoute;
export type TPrivateRoute = TRoute & {
    roles: number[];
};

export type TRoutes = {
    public: TPublicRoute[];
    private: TPrivateRoute[];
};

const userRoles = {
    admin: [Role.admin],
    teacher: [Role.teacher],
    student: [Role.student],
};

export const routes: TRoutes = {
    public: [
        {
            id: 1,
            path: "/",
            element: <RedirectionToRolePage />,
        },
        {
            id: 2,
            path: "/login",
            element: <LoginPage />,
            fallback: <LoginPageSkeleton />,
        },
        {
            id: 3,
            path: "/un-authorized",
            element: <UnAuthorizedPage />,
        },
        {
            id: 4,
            path: "*",
            element: <NotFoundPage />,
        },
    ],
    private: [
        {
            id: 4,
            path: "/materials",
            element: <MaterialsPage />,
            roles: userRoles.student,
        },
        {
            id: 5,
            path: "/practice",
            element: <PracticePage />,
            roles: userRoles.student,
        },
        {
            id: 7,
            path: "/exams",
            element: <ExamsPage />,
            roles: [
                ...userRoles.admin,
                ...userRoles.teacher,
                ...userRoles.student,
            ],
        },
        {
            id: 8,
            path: "/tests",
            element: <TestsPage />,
            roles: [...userRoles.admin, ...userRoles.teacher],
        },
        {
            id: 9,
            path: "/teachers",
            element: <TeachersPage />,
            roles: userRoles.admin,
        },
        {
            id: 10,
            path: "/students",
            element: <StudentsPage />,
            roles: userRoles.admin,
        },
        {
            id: 11,
            path: "/groups",
            element: <GroupsPage />,
            roles: userRoles.admin,
        },
    ],
};