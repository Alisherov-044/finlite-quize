import { z } from "zod";
import { useMutation, useQuery } from "react-query";
import {
    useActive,
    useDispatch,
    useOpen,
    usePagination,
    useSelector,
    useTranslate,
} from "@/hooks";
import {
    Confirmation,
    FormDrawer,
    Icons,
    PageHeaderAction,
    UserCard,
    UserCardSkeleton,
} from "@/components";
import { debounce } from "lodash";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
    Button,
    Empty,
    Flex,
    Form,
    Input,
    Pagination,
    Row,
    Select,
    Typography,
    notification,
} from "antd";
import { FormItem, Col } from "@/components/styles";
import { fillValues, getCurrentRole, parsePhoneNumber } from "@/utils";
import { Navigate, useLocation } from "react-router-dom";
import { axiosMedia, axiosPrivate } from "@/lib";
import {
    GROUPS_URL,
    STUDENTS_DELETE_URL,
    STUDENTS_EDIT_URL,
    STUDENTS_URL,
    UPLOAD_DELETE_URL,
} from "@/utils/urls";
import type { TGroupsResponse } from "@/pages/groups";
import type { TSetValue } from "@/utils/fill-values";
import type { TUser } from "@/components/cards/user-card";
import {
    TDeletionRequest,
    TDeletionResponse,
} from "@/components/image-upload-uploaded";
import {
    setCurrentUploadedImage,
    setCurrentUploadedImageOrigin,
} from "@/redux/slices/uploadSlice";
import ReactInputMask from "react-input-mask";
import { AxiosError } from "axios";
import { setAuth } from "@/redux/slices/authSlice";

export const StudentFormScheme = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone_number: z
        .string({ required_error: "telefon raqamingizni kiriting" })
        .optional(),
    password: z.string().optional(),
    confirm_password: z.string().optional(),
    group_id: z.number().optional(),
});

export type TStudentsResponse = {
    data: TUser[];
    meta: {
        pageCount: number;
        itemCount: number;
    };
};

export type TStudentsRequest = z.infer<typeof StudentFormScheme> & {
    role: string;
};

export default function StudentsPage() {
    const { t } = useTranslate();
    const { roles, access_token } = useSelector((state) => state.auth);
    const currentRole = getCurrentRole(roles);
    const location = useLocation();
    const [page, setPage] = useState<number>(1);
    const [search, setSearch] = useState<string>("");

    if (!currentRole) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const { isOpen, open, close } = useOpen();
    const { active: deleteStudent, setActive: setDeleteStudent } = useActive<
        number | null
    >(null);
    const { active: editStudent, setActive: setEditStudent } = useActive<
        number | null
    >(null);
    const {
        data: students,
        isLoading: isStudentsLoading,
        refetch,
        error,
    } = useQuery<TStudentsResponse, AxiosError<{ error: string }>>("students", {
        queryFn: async () =>
            await axiosPrivate
                .get(STUDENTS_URL(page, search.trim().replaceAll(" ", "")), {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                    },
                })
                .then((res) => res.data.data),
    });
    const { data: groups, isLoading: isGroupsLoading } =
        useQuery<TGroupsResponse>("groups", {
            queryFn: async () =>
                await axiosPrivate
                    .get(GROUPS_URL(), {
                        headers: {
                            Authorization: `Bearer ${access_token}`,
                        },
                    })
                    .then((res) => res.data.data),
        });
    const { mutate, isLoading: isSubmitting } = useMutation<
        TStudentsResponse,
        Error,
        TStudentsRequest
    >({
        mutationFn: async (data) =>
            await axiosPrivate
                .post(STUDENTS_URL(), data, {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                    },
                })
                .then((res) => res.data.data),
    });
    const { mutate: update, isLoading: isUpdating } = useMutation<
        TStudentsResponse,
        Error,
        TStudentsRequest
    >({
        mutationFn: async (data) =>
            await axiosPrivate
                .patch(STUDENTS_EDIT_URL(editStudent!), data, {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                    },
                })
                .then((res) => res.data.data),
    });
    const { mutate: deleteUser, isLoading: isDeleting } = useMutation<
        TStudentsResponse,
        Error,
        number
    >({
        mutationFn: async (id) =>
            await axiosPrivate
                .delete(STUDENTS_DELETE_URL(deleteStudent ?? id), {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                    },
                })
                .then((res) => res.data.data),
    });
    const { mutate: deleteImg } = useMutation<
        TDeletionResponse,
        Error,
        TDeletionRequest
    >({
        mutationFn: async (key) =>
            await axiosMedia
                .post(UPLOAD_DELETE_URL, key, {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                    },
                })
                .then((res) => res.data),
    });
    const {
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { isLoading: isFormLoading },
    } = useForm<z.infer<typeof StudentFormScheme>>({
        resolver: zodResolver(StudentFormScheme),
        defaultValues: {
            phone_number: "+(998)",
        },
    });
    const dispatch = useDispatch();
    const { currentUploadedImage } = useSelector((state) => state.upload);
    const { currentPage, goTo } = usePagination(
        "students-pagination",
        students?.meta.itemCount!
    );

    useEffect(() => {
        setPage(currentPage);
    }, [currentPage]);

    useEffect(() => {
        refetch();
    }, [page, search]);

    if (error?.response?.data.error === "JWT_EXPIRED") {
        dispatch(
            setAuth({
                id: -1,
                roles: [],
                isAuthenticated: false,
                access_token: "",
                refresh_token: "",
                name: undefined,
                phone_number: undefined,
            })
        );
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    });

    const debouncedSearch = useMemo(
        () =>
            debounce(
                ({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
                    setSearch(value),
                200
            ),
        []
    );

    function onSubmit(values: z.infer<typeof StudentFormScheme>) {
        if (editStudent) {
            const updatedValues: z.infer<typeof StudentFormScheme> =
                {} as z.infer<typeof StudentFormScheme>;
            const student = students?.data.find(
                (item) => item.id === editStudent
            );

            const objKeys = Object.keys(values);

            for (let i = 0; i < objKeys.length; i++) {
                // @ts-ignore
                if (values[objKeys[i]] !== student[objKeys[i]]) {
                    // @ts-ignore
                    updatedValues[objKeys[i]] = values[objKeys[i]];
                }
            }

            update(
                {
                    ...updatedValues,
                    group_id: Number(updatedValues.group_id),
                    phone_number: parsePhoneNumber(updatedValues.phone_number),
                    role: "student",
                },
                {
                    onSuccess: () => {
                        notification.success({
                            message: t("O'quvchi Tahrirlandi"),
                            icon: <Icons.checkCircle />,
                            closeIcon: false,
                        });
                        refetch();
                        onCancel(true);
                    },
                    onError: (error) => {
                        notification.error({
                            message: t(error.message),
                            closeIcon: false,
                        });
                    },
                }
            );
        } else {
            if (!values.phone_number || values.phone_number?.length < 19) {
                return notification.error({
                    message: t("Telefon raqamni to'liq kiring"),
                    closeIcon: false,
                });
            }
            mutate(
                {
                    ...values,
                    group_id: Number(values.group_id),
                    phone_number: parsePhoneNumber(values.phone_number),
                    role: "student",
                },
                {
                    onSuccess: () => {
                        notification.success({
                            message: t("O'quvchi Yaratildi"),
                            icon: <Icons.checkCircle />,
                            closeIcon: false,
                        });
                        refetch();
                        onCancel(true);
                    },
                    onError: (error) => {
                        notification.error({
                            message: t(error.message),
                            closeIcon: false,
                        });
                    },
                }
            );
        }
    }

    function onCancel(success: boolean = false) {
        if (isSubmitting) return;
        close();
        reset();
        if (!success && !editStudent) {
            if (currentUploadedImage) {
                deleteImg({ key: currentUploadedImage.key });
            }
        }
        setEditStudent(null);
        dispatch(setCurrentUploadedImage(null));
        dispatch(setCurrentUploadedImageOrigin(null));
    }

    function onDelete() {
        if (deleteStudent) {
            deleteUser(deleteStudent, {
                onSuccess: () => {
                    notification.success({
                        message: t("O'quvchi o'chirildi"),
                        icon: <Icons.checkCircle />,
                        closeIcon: null,
                    });
                    refetch();
                },
                onError: (error) => {
                    notification.error({
                        message: t(error.message),
                        closeIcon: null,
                    });
                },
            });
            if (currentUploadedImage) {
                deleteImg({ key: currentUploadedImage.key });
            }
        }
        onDeleteCancel();
    }

    function onDeleteCancel() {
        setDeleteStudent(null);
        dispatch(setCurrentUploadedImage(null));
        dispatch(setCurrentUploadedImageOrigin(null));
    }

    useEffect(() => {
        if (editStudent) {
            let student = students?.data.find(
                (student) => student.id === editStudent
            );

            if (student) {
                fillValues(setValue as TSetValue, student, [
                    "first_name",
                    "last_name",
                    "phone_number",
                    "group_id",
                ]);
            }
        }
    }, [editStudent]);

    return (
        <main className="pb-10">
            <div className="flex flex-col container">
                {["admin", "teacher"].includes(currentRole) ? (
                    <PageHeaderAction
                        title={t("O'quvchi qo'shish")}
                        btnText={t("Qo'shish")}
                        onAction={open}
                    />
                ) : null}
                <Flex className="flex-col gap-y-4 mt-10">
                    <Flex className="items-center justify-between">
                        <Typography className="!text-sm font-bold !text-blue-900">
                            {t("O'quvchilar ro'yxati")}
                        </Typography>
                    </Flex>
                    <Input
                        prefix={<Icons.search />}
                        placeholder={t("Qidirish...")}
                        prefixCls="search-input"
                        onChange={debouncedSearch}
                    />
                </Flex>
                <Flex className="pb-10 flex-auto flex-col gap-y-5 mt-10">
                    {isStudentsLoading ? (
                        [...Array(3).keys()].map((key) => (
                            <UserCardSkeleton key={key} role="student" />
                        ))
                    ) : students?.data && students.data.length ? (
                        students.data.map((student) => (
                            <UserCard
                                key={student.id}
                                user={student}
                                onEdit={() => setEditStudent(student.id)}
                                onDelete={() => setDeleteStudent(student.id)}
                            />
                        ))
                    ) : (
                        <Flex className="flex-auto items-center justify-center">
                            <Empty description={t("Ma'lumotlar mavjud emas")} />
                        </Flex>
                    )}
                </Flex>
                <Pagination
                    className="flex items-center justify-center"
                    current={currentPage}
                    onChange={(e) => goTo(e)}
                    pageSize={10}
                    total={students?.meta.itemCount!}
                />

                <FormDrawer
                    open={isOpen || !!editStudent}
                    width={600}
                    onCancel={() => onCancel()}
                    title={
                        editStudent ? t("Tahrirlash") : t("O'quvchi Qo'shish")
                    }
                    footer={
                        <Button
                            form="student-form"
                            htmlType="submit"
                            loading={
                                isFormLoading || isSubmitting || isUpdating
                            }
                            disabled={
                                isFormLoading || isSubmitting || isUpdating
                            }
                            className="!w-full"
                        >
                            {t(editStudent ? "Tahrirlash" : "Qo'shish")}
                        </Button>
                    }
                >
                    <Form
                        id="student-form"
                        className="flex flex-col gap-y-5"
                        onFinish={handleSubmit(onSubmit)}
                    >
                        <Row gutter={24}>
                            <Col span={12}>
                                <FormItem label={t("Ism")}>
                                    <Controller
                                        name="first_name"
                                        control={control}
                                        render={({ field }) => (
                                            <Input {...field} />
                                        )}
                                    />
                                </FormItem>
                            </Col>
                            <Col span={12}>
                                <FormItem label={t("Familiya")}>
                                    <Controller
                                        name="last_name"
                                        control={control}
                                        render={({ field }) => (
                                            <Input {...field} />
                                        )}
                                    />
                                </FormItem>
                            </Col>
                        </Row>
                        <Row gutter={24}>
                            <Col span={12}>
                                <FormItem label={t("Telefon raqam")}>
                                    <Controller
                                        name="phone_number"
                                        control={control}
                                        render={({ field }) => (
                                            <ReactInputMask
                                                className="ant-input"
                                                mask="+(999) 99 999-99-99"
                                                maskChar={null}
                                                type="tel"
                                                {...field}
                                            />
                                        )}
                                    />
                                </FormItem>
                            </Col>
                            <Col span={12}>
                                <FormItem label={t("Parol")}>
                                    <Controller
                                        name="password"
                                        control={control}
                                        render={({ field }) => (
                                            <Input.Password
                                                iconRender={(visible) =>
                                                    visible ? (
                                                        <Icons.eye.open />
                                                    ) : (
                                                        <Icons.eye.close />
                                                    )
                                                }
                                                {...field}
                                            />
                                        )}
                                    />
                                </FormItem>
                            </Col>
                        </Row>
                        <Row>
                            <Col span={24}>
                                <FormItem label={t("Parolni tasdiqlash")}>
                                    <Controller
                                        name="confirm_password"
                                        control={control}
                                        render={({ field }) => (
                                            <Input.Password
                                                iconRender={(visible) =>
                                                    visible ? (
                                                        <Icons.eye.open />
                                                    ) : (
                                                        <Icons.eye.close />
                                                    )
                                                }
                                                {...field}
                                            />
                                        )}
                                    />
                                </FormItem>
                            </Col>
                            <Col span={24}>
                                <FormItem label={t("Guruh")}>
                                    <Controller
                                        name="group_id"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                className="!py-2"
                                                prefixCls="form-select"
                                                suffixIcon={
                                                    <Icons.arrow.select />
                                                }
                                                loading={isGroupsLoading}
                                                options={groups?.data}
                                                fieldNames={{
                                                    label: "name",
                                                    value: "id",
                                                }}
                                                {...field}
                                            />
                                        )}
                                    />
                                </FormItem>
                            </Col>
                        </Row>
                    </Form>
                </FormDrawer>

                <Confirmation
                    isOpen={!!deleteStudent}
                    onCancel={onDeleteCancel}
                    onConfirm={onDelete}
                    btnText={t("O'chirish")}
                    title={t("O'chirish")}
                    loading={isDeleting}
                    description={t("O'quvchini o'chirmoqchimisiz?")}
                />
            </div>
        </main>
    );
}
