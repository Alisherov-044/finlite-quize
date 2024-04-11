import { z } from "zod";
import { useMutation, useQuery } from "react-query";
import {
    useActive,
    useDispatch,
    useOpen,
    useSelector,
    useTranslate,
} from "@/hooks";
import { options } from "@/components/data";
import {
    Confirmation,
    FormDrawer,
    Icons,
    ImageUpload,
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
    Row,
    Select,
    Typography,
    notification,
} from "antd";
import { FormItem, Col } from "@/components/styles";
import { fillValues, getCurrentRole } from "@/utils";
import { Navigate, useLocation } from "react-router-dom";
import { axiosMedia, axiosPrivate, axiosPublic } from "@/lib";
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

export const StudentFormScheme = z.object({
    first_name: z.string(),
    last_name: z.string(),
    phone_number: z.string(),
    password: z.string().optional(),
    group_id: z.number(),
    image_url: z.string().optional(),
});

export type TStudentsResponse = {
    data: {
        data: TUser[];
    };
};

export type TStudentsRequest = z.infer<typeof StudentFormScheme> & {
    role: string;
};

export default function StudentsPage() {
    const { t } = useTranslate();
    const { roles } = useSelector((state) => state.auth);
    const currentRole = getCurrentRole(roles);
    const location = useLocation();

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
    } = useQuery<TStudentsResponse>("students", {
        queryFn: async () => await axiosPublic(STUDENTS_URL),
    });
    const { data: groups, isLoading: isGroupsLoading } =
        useQuery<TGroupsResponse>("groups", {
            queryFn: async () => await axiosPublic.get(GROUPS_URL),
        });
    const { mutate, isLoading: isSubmitting } = useMutation<
        TStudentsResponse,
        Error,
        TStudentsRequest
    >({
        mutationFn: async (data) => await axiosPrivate.post(STUDENTS_URL, data),
    });
    const { mutate: update, isLoading: isUpdating } = useMutation<
        TStudentsResponse,
        Error,
        TStudentsRequest
    >({
        mutationFn: async (data) =>
            await axiosPrivate.patch(STUDENTS_EDIT_URL(editStudent!), data),
    });
    const { mutate: deleteUser, isLoading: isDeleting } = useMutation<
        TStudentsResponse,
        Error,
        number
    >({
        mutationFn: async (id) =>
            await axiosPrivate.delete(STUDENTS_DELETE_URL(deleteStudent ?? id)),
    });
    const { mutate: deleteImg } = useMutation<
        TDeletionResponse,
        Error,
        TDeletionRequest
    >({
        mutationFn: async (key) =>
            await axiosMedia.post(UPLOAD_DELETE_URL, key),
    });
    const {
        handleSubmit,
        control,
        reset,
        setValue,
        getValues,
        resetField,
        formState: { isLoading: isFormLoading },
    } = useForm<z.infer<typeof StudentFormScheme>>({
        resolver: zodResolver(StudentFormScheme),
    });
    const dispatch = useDispatch();
    const { currentUploadedImage } = useSelector((state) => state.upload);
    const [search, setSearch] = useState<string>("");
    const [_, setFilter] = useState<string>("");

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
            const student = students?.data.data.find(
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
                    group_id: Number(values.group_id),
                    role: "student",
                },
                {
                    onSuccess: () => {
                        notification.success({
                            message: t("Student Tahrirlandi"),
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
                        onCancel();
                    },
                }
            );
        } else {
            mutate(
                {
                    ...values,
                    group_id: Number(values.group_id),
                    role: "student",
                },
                {
                    onSuccess: () => {
                        notification.success({
                            message: t("Student Yaratildi"),
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
                        onCancel();
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
            let student = students?.data.data.find(
                (student) => student.id === editStudent
            );

            if (student) {
                fillValues(setValue as TSetValue, student, [
                    "first_name",
                    "last_name",
                    "phone_number",
                    "group_id",
                ]);

                dispatch(
                    setCurrentUploadedImage({
                        url: student.image_url,
                        key: `${import.meta.env.VITE_IMAGE_UPLOAD_CLIENT}/${
                            student.image_url.split("/")[
                                student.image_url.split("/").length - 1
                            ]
                        }`,
                        project: import.meta.env.VITE_IMAGE_UPLOAD_CLIENT,
                    })
                );
            }
        }
    }, [editStudent]);

    useEffect(() => {
        if (deleteStudent) {
            let student = students?.data.data.find(
                (student) => student.id === deleteStudent
            );

            if (student) {
                dispatch(
                    setCurrentUploadedImage({
                        url: student.image_url,
                        key: `${import.meta.env.VITE_IMAGE_UPLOAD_CLIENT}/${
                            student.image_url.split("/")[
                                student.image_url.split("/").length - 1
                            ]
                        }`,
                        project: import.meta.env.VITE_IMAGE_UPLOAD_CLIENT,
                    })
                );
            }
        }
    }, [deleteStudent]);

    return (
        <main>
            <div className="flex flex-col container">
                {currentRole === "admin" ? (
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
                        <Select
                            placeholder={t("Saralash")}
                            suffixIcon={<Icons.arrow.select />}
                            prefixCls="sort-select"
                            placement="bottomRight"
                            options={options}
                            onChange={(value) => setFilter(value)}
                        />
                    </Flex>
                    <Input
                        prefix={<Icons.search />}
                        placeholder={t("Qidirish...")}
                        prefixCls="search-input"
                        onChange={debouncedSearch}
                    />
                </Flex>
                <Flex className="flex-auto flex-col gap-y-5 mt-10">
                    {isStudentsLoading ? (
                        [...Array(3).keys()].map((key) => (
                            <UserCardSkeleton key={key} role="student" />
                        ))
                    ) : students?.data.data && students.data.data.length ? (
                        students.data.data
                            .filter((student) =>
                                search.length
                                    ? `${student.first_name} ${student.last_name}`
                                          .toLocaleLowerCase()
                                          .includes(search.toLocaleLowerCase())
                                    : true
                            )
                            .map((student) => (
                                <UserCard
                                    key={student.id}
                                    user={student}
                                    onEdit={() => setEditStudent(student.id)}
                                    onDelete={() =>
                                        setDeleteStudent(student.id)
                                    }
                                />
                            ))
                    ) : (
                        <Flex className="flex-auto items-center justify-center">
                            <Empty description={false} />
                        </Flex>
                    )}
                </Flex>

                <FormDrawer
                    open={isOpen || !!editStudent}
                    width={600}
                    onClose={() => onCancel()}
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
                                            <Input type="tel" {...field} />
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
                                            <Input.Password {...field} />
                                        )}
                                    />
                                </FormItem>
                            </Col>
                        </Row>
                        <Row>
                            <Col span={24}>
                                <FormItem label={t("Guruh")}>
                                    <Controller
                                        name="group_id"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                prefixCls="form-select"
                                                suffixIcon={
                                                    <Icons.arrow.select />
                                                }
                                                loading={isGroupsLoading}
                                                options={groups?.data.data}
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
                        <Row>
                            <Col span={24}>
                                <FormItem>
                                    <Controller
                                        name="image_url"
                                        control={control}
                                        render={() => (
                                            <ImageUpload
                                                setUrl={(url) => {
                                                    setValue("image_url", url);
                                                    console.log(getValues());
                                                }}
                                                resetUrl={() =>
                                                    resetField("image_url")
                                                }
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
