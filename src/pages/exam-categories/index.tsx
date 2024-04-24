import { z } from "zod";
import { FormDrawer, Icons, PageHeaderAction } from "@/components";
import { FormItem, Col } from "@/components/styles";
import { useOpen, useSelector, useTranslate } from "@/hooks";
import { getCurrentRole } from "@/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Button,
    Flex,
    Form,
    Input,
    Row,
    Table,
    TableProps,
    notification,
} from "antd";
import { debounce } from "lodash";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "react-query";
import { Navigate, useLocation } from "react-router-dom";
import { axiosPrivate, axiosPublic } from "@/lib";
import { EXAM_CATEGORIES_URL } from "@/utils/urls";

type ColumnsType<T> = TableProps<T>["columns"];

export type TExamCategory = {
    id: number;
    name: string;
};

export type TExamCategoriesResponse = {
    data: TExamCategory[];
};

const columns: ColumnsType<TExamCategory> = [
    {
        title: null,
        dataIndex: "id",
        width: "10%",
        className: "id",
        key: "id",
    },
    {
        title: null,
        dataIndex: "name",
        width: "90%",
        key: "name",
    },
];

export const ExamCategoriesFormScheme = z.object({
    name: z.string(),
});

export default function ExamCategoriesPage() {
    const { t } = useTranslate();
    const { roles } = useSelector((state) => state.auth);
    const currentRole = getCurrentRole(roles);
    const location = useLocation();

    if (!currentRole) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const { isOpen, open, close } = useOpen();
    const {
        data: examCategories,
        isLoading,
        refetch,
    } = useQuery<TExamCategoriesResponse>("exam-categories", {
        queryFn: async () =>
            await axiosPublic.get(EXAM_CATEGORIES_URL).then((res) => res.data),
    });
    const { mutate, isLoading: isSubmitting } = useMutation<
        TExamCategoriesResponse,
        Error,
        Omit<TExamCategory, "id">
    >({
        mutationFn: async (data) =>
            await axiosPrivate
                .post(EXAM_CATEGORIES_URL, data)
                .then((res) => res.data),
    });
    const {
        handleSubmit,
        control,
        reset,
        formState: { isLoading: isFormLoading },
    } = useForm<z.infer<typeof ExamCategoriesFormScheme>>({
        resolver: zodResolver(ExamCategoriesFormScheme),
    });

    const [tableParams] = useState({
        pagination: {
            current: 1,
            pageSize: 10,
        },
    });
    const [search, setSearch] = useState<string>("");

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

    function onCancel() {
        close();
        reset();
    }

    function onSubmit(values: z.infer<typeof ExamCategoriesFormScheme>) {
        mutate(values, {
            onSuccess: () => {
                notification.success({
                    message: t("Imtihon Bo'limi yaratildi"),
                    icon: <Icons.checkCircle />,
                    closeIcon: false,
                });
                refetch();
                onCancel();
            },
            onError: (error) => {
                notification.error({
                    message: t(error.message),
                    closeIcon: false,
                });
            },
        });
    }

    return (
        <main>
            <div className="flex flex-col container">
                {currentRole === "admin" ? (
                    <PageHeaderAction
                        title={t("Imtihon Bo'limi yaratish")}
                        btnText={t("Imtihon Bo'limi yaratish")}
                        onAction={open}
                    />
                ) : null}
                <Flex className="flex-col">
                    <Flex className="items-center justify-center border rounded-md !rounded-b-none p-2.5 mt-8">
                        <Input
                            prefix={<Icons.search />}
                            placeholder={t("Qidirish...")}
                            prefixCls="search-input"
                            onChange={debouncedSearch}
                        />
                    </Flex>
                    <Table
                        columns={columns}
                        loading={isLoading}
                        dataSource={
                            examCategories?.data &&
                            examCategories.data.filter((item) =>
                                search
                                    ? item.name
                                          .toLocaleLowerCase()
                                          .includes(search.toLocaleLowerCase())
                                    : true
                            )
                        }
                        pagination={tableParams.pagination}
                    />
                </Flex>

                <FormDrawer
                    open={isOpen}
                    width={600}
                    onCancel={onCancel}
                    title={t("Imtihon Bo'limi Yaratish")}
                    footer={
                        <Button
                            className="!w-full"
                            form="exam-categories-form"
                            htmlType="submit"
                            loading={isFormLoading || isSubmitting}
                            disabled={isFormLoading || isSubmitting}
                        >
                            {t("Yaratish")}
                        </Button>
                    }
                >
                    <Form
                        id="exam-categories-form"
                        onFinish={handleSubmit(onSubmit)}
                    >
                        <Row>
                            <Col span={24}>
                                <FormItem label={t("Bo'lim nomi")}>
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field }) => (
                                            <Input {...field} />
                                        )}
                                    />
                                </FormItem>
                            </Col>
                        </Row>
                    </Form>
                </FormDrawer>
            </div>
        </main>
    );
}