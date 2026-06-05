"use client";

import { useState } from "react";
import Link from "next/link";
import {
    GraduationCap,
    CheckCircle2,
    ArrowRight,
    ChevronRight,
    Sparkles,
    Calendar,
    DollarSign,
    Check,
    Activity,
    FileText,
    BarChart3,
    Users,
    Smartphone,
    Laptop,
    BookOpen,
    AlertCircle,
    MessageSquare,
    Mail,
    Phone,
    MapPin,
    Loader2,
    Lock
} from "lucide-react";
import { toast } from "sonner";
import { submitContactRequest, ContactInput } from "@/lib/actions/contact";

export default function LandingPageClient() {
    // State cho phần giải pháp (Tabs)
    const [activeTab, setActiveTab] = useState<"admin" | "teacher" | "student" | "parent">("admin");

    // State cho Form Liên hệ & Báo giá
    const [formData, setFormData] = useState<ContactInput>({
        schoolName: "",
        contactName: "",
        email: "",
        phone: "",
        schoolSize: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Xử lý thay đổi input
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Xử lý gửi Form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await submitContactRequest(formData);
            if (res.success) {
                toast.success("Gửi yêu cầu thành công!", {
                    description: "Đội ngũ của chúng tôi sẽ liên hệ lại với bạn trong vòng 24h làm việc.",
                });
                // Reset form
                setFormData({
                    schoolName: "",
                    contactName: "",
                    email: "",
                    phone: "",
                    schoolSize: "",
                    message: "",
                });
            } else {
                toast.error("Gửi yêu cầu thất bại", {
                    description: res.error || "Vui lòng kiểm tra lại thông tin.",
                });
            }
        } catch (err) {
            console.error(err);
            toast.error("Đã xảy ra lỗi hệ thống", {
                description: "Vui lòng thử lại sau hoặc liên hệ hotline.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Hàm tiện ích để cuộn mượt
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white antialiased overflow-x-hidden font-sans">
            
            {/* 1. Header / Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
                            <GraduationCap className="h-5.5 w-5.5 text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
                                E-Learning Platform
                            </span>
                            <span className="block text-[10px] font-medium text-slate-500 tracking-wider uppercase">
                                B2B School Solution
                            </span>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <nav className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection("pain-points")} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                            Vấn đề
                        </button>
                        <button onClick={() => scrollToSection("solutions")} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                            Giải pháp
                        </button>
                        <button onClick={() => scrollToSection("values")} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                            Giá trị
                        </button>
                        <button onClick={() => scrollToSection("contact")} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                            Liên hệ & Báo giá
                        </button>
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-[0.98]"
                        >
                            <Lock className="h-3.5 w-3.5" />
                            Đăng nhập portal
                        </Link>
                        <button
                            onClick={() => scrollToSection("contact")}
                            className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/15 hover:shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-[0.98] cursor-pointer"
                        >
                            Nhận báo giá
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* 2. Hero Section */}
            <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 lg:pt-24 lg:pb-32 bg-gradient-to-b from-blue-50/50 via-white to-slate-50">
                {/* Background Blobs */}
                <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 right-[-10%] w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl" />
                    <div className="absolute top-[40%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/30 rounded-full blur-3xl" />
                </div>

                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8 items-center">
                        {/* Hero Text */}
                        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                                Giải pháp quản lý & đào tạo B2B khép kín
                            </div>
                            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl leading-[1.15]">
                                Số hóa vận hành <br />
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Nâng tầm giảng dạy
                                </span>
                            </h1>
                            <p className="mx-auto lg:mx-0 max-w-2xl text-base sm:text-lg md:text-xl text-slate-500 leading-relaxed font-normal">
                                Nền tảng LMS chuyên biệt dành cho các trường học và trung tâm giáo dục hiện đại. Quản lý điểm danh, chấm bài tự động với sự hỗ trợ của AI và kết nối phụ huynh tức thời trên một hệ thống bảo mật.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                <button
                                    onClick={() => scrollToSection("contact")}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:scale-[1.01] hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
                                >
                                    Đăng ký tư vấn & Nhận Demo
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => scrollToSection("pain-points")}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Tìm hiểu thêm
                                </button>
                            </div>

                            {/* Trust badges */}
                            <div className="pt-8 border-t border-slate-100 flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tích hợp sẵn:</span>
                                <div className="flex items-center gap-1 text-slate-500 font-semibold text-sm">
                                    <Activity className="h-4 w-4 text-emerald-500" /> Báo cáo chuyên cần Realtime
                                </div>
                                <div className="flex items-center gap-1 text-slate-500 font-semibold text-sm">
                                    <Sparkles className="h-4 w-4 text-purple-500" /> Phân tích học tập AI
                                </div>
                            </div>
                        </div>

                        {/* Interactive Dashboard Mockup */}
                        <div className="lg:col-span-6 relative">
                            <div className="relative mx-auto max-w-[540px] rounded-2xl border border-slate-200 bg-white/70 p-3.5 shadow-2xl shadow-slate-300/60 backdrop-blur-md transition-transform duration-500 hover:scale-[1.01]">
                                {/* Window header dots */}
                                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                                    <div className="flex gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400">demo.lms-platform.school</span>
                                    <div className="w-10 h-1" />
                                </div>

                                {/* Simulated Mini-App Layout */}
                                <div className="grid grid-cols-12 gap-3 pt-3">
                                    {/* Sidebar */}
                                    <div className="col-span-3 space-y-2 border-r border-slate-100 pr-2">
                                        <div className="h-6 w-full rounded-md bg-blue-50 border border-blue-100 flex items-center px-2 text-[10px] font-semibold text-blue-700">
                                            Tổng quan
                                        </div>
                                        <div className="h-6 w-full rounded-md hover:bg-slate-50 flex items-center px-2 text-[10px] font-medium text-slate-500">
                                            Lớp học
                                        </div>
                                        <div className="h-6 w-full rounded-md hover:bg-slate-50 flex items-center px-2 text-[10px] font-medium text-slate-500">
                                            Điểm danh
                                        </div>
                                        <div className="h-6 w-full rounded-md hover:bg-slate-50 flex items-center px-2 text-[10px] font-medium text-slate-500">
                                            Bài tập & Thi
                                        </div>
                                        <div className="h-6 w-full rounded-md hover:bg-slate-50 flex items-center px-2 text-[10px] font-medium text-slate-500">
                                            Học phí
                                        </div>
                                        <div className="h-6 w-full rounded-md hover:bg-slate-50 flex items-center px-2 text-[10px] font-semibold text-purple-600 bg-purple-50/50">
                                            Báo cáo AI
                                        </div>
                                    </div>

                                    {/* Dashboard Content Area */}
                                    <div className="col-span-9 space-y-3">
                                        {/* Welcome Banner */}
                                        <div className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white">
                                            <p className="text-[11px] font-medium opacity-90">Học kỳ II - 2026</p>
                                            <p className="text-sm font-bold mt-0.5">Trường Quốc tế Sao Mai</p>
                                        </div>

                                        {/* Stats Cards grid */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2 text-center shadow-sm">
                                                <span className="block text-[8px] font-bold text-slate-400 uppercase">Chuyên cần</span>
                                                <span className="text-xs font-extrabold text-emerald-600">98.2%</span>
                                                <span className="block text-[8px] font-semibold text-emerald-500 mt-0.5">+1.2%</span>
                                            </div>
                                            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2 text-center shadow-sm">
                                                <span className="block text-[8px] font-bold text-slate-400 uppercase">Đã nộp bài</span>
                                                <span className="text-xs font-extrabold text-indigo-600">94.5%</span>
                                                <span className="block text-[8px] font-semibold text-indigo-500 mt-0.5">+2.4%</span>
                                            </div>
                                            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2 text-center shadow-sm">
                                                <span className="block text-[8px] font-bold text-slate-400 uppercase">Thu học phí</span>
                                                <span className="text-xs font-extrabold text-blue-600">89%</span>
                                                <span className="block text-[8px] font-semibold text-blue-500 mt-0.5">Đúng hạn</span>
                                            </div>
                                        </div>

                                        {/* Chart & Activity Lists simulation */}
                                        <div className="rounded-lg border border-slate-100 p-2.5 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                    <Activity className="h-3 w-3 text-blue-500 animate-pulse" /> Nhật ký chuyên cần hôm nay
                                                </span>
                                                <span className="text-[8px] font-semibold rounded bg-emerald-50 text-emerald-700 px-1">Ổn định</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-[9px] border-b border-slate-50 pb-1">
                                                    <span className="font-semibold text-slate-700">Lớp 10A1</span>
                                                    <span className="text-slate-400">Sĩ số: 38/40</span>
                                                    <span className="font-bold text-emerald-600">95%</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[9px] border-b border-slate-50 pb-1">
                                                    <span className="font-semibold text-slate-700">Lớp 11B2</span>
                                                    <span className="text-slate-400">Sĩ số: 42/42</span>
                                                    <span className="font-bold text-emerald-600">100%</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[9px]">
                                                    <span className="font-semibold text-slate-700">Lớp 12C3</span>
                                                    <span className="text-slate-400">Sĩ số: 39/40</span>
                                                    <span className="font-bold text-emerald-600">97.5%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating decorative elements */}
                            <div className="absolute -bottom-6 -left-6 rounded-xl border border-slate-150 bg-white p-3 shadow-lg flex items-center gap-2.5 max-w-[200px] backdrop-blur-md">
                                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <Sparkles className="h-4.5 w-4.5 text-purple-600" />
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">AI Trợ Lý</span>
                                    <span className="block text-xs font-bold text-slate-700">Chấm bài tự động</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Pain Points Section */}
            <section id="pain-points" className="py-20 md:py-28 bg-white border-t border-b border-slate-100">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
                        <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">Nỗi đau vận hành</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
                            Những thách thức cốt lõi của Trường học
                        </h2>
                        <div className="h-1 w-12 bg-blue-600 mx-auto rounded" />
                        <p className="text-slate-500 text-base sm:text-lg">
                            Các phương thức thủ công và hệ thống chắp vá đang cản trở hiệu suất quản lý và làm giảm chất lượng kết nối trong giáo dục.
                        </p>
                    </div>

                    {/* Cards grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Pain Point 1 */}
                        <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300">
                            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Quá tải sổ sách hành chính</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Giáo viên mất quá nhiều thời gian điểm danh giấy, cộng điểm thủ công và lập báo cáo học tập định kỳ cuối tháng.
                            </p>
                        </div>

                        {/* Pain Point 2 */}
                        <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300">
                            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Đứt gãy thông tin Phụ huynh</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Phụ huynh không biết con mình có đến lớp an toàn hay không, tiến độ làm bài tập hàng ngày chỉ nắm qua sổ liên lạc giấy cuối kỳ.
                            </p>
                        </div>

                        {/* Pain Point 3 */}
                        <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300">
                            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Quản lý tài chính rối ren</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Đối soát học phí, phí phát sinh, trạng thái đóng tiền của từng học sinh dễ nhầm lẫn. Thiếu các kênh thanh toán số an toàn.
                            </p>
                        </div>

                        {/* Pain Point 4 */}
                        <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300">
                            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 group-hover:bg-violet-100 transition-colors">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Thiếu báo cáo quản trị</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Ban giám hiệu không có cái nhìn toàn cảnh về chất lượng học tập, tỉ lệ chuyên cần và hiệu suất của từng lớp học trong thời gian thực.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Solutions Section */}
            <section id="solutions" className="py-20 md:py-28 bg-slate-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
                        <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">Giải pháp toàn diện</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
                            Một nền tảng - Kết nối 4 vai trò
                        </h2>
                        <div className="h-1 w-12 bg-blue-600 mx-auto rounded" />
                        <p className="text-slate-500 text-base sm:text-lg">
                            Thiết kế đồng bộ hóa dữ liệu tuyệt đối giữa Ban giám hiệu, Giáo viên, Học sinh và Phụ huynh trên từng luồng nghiệp vụ.
                        </p>
                    </div>

                    {/* Interactive Tab Switcher */}
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
                        {[
                            { id: "admin", label: "Ban Giám Hiệu", icon: Users },
                            { id: "teacher", label: "Giáo viên", icon: GraduationCap },
                            { id: "student", label: "Học sinh", icon: Laptop },
                            { id: "parent", label: "Phụ huynh", icon: Smartphone },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-200 cursor-pointer ${
                                        activeTab === tab.id
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content Display */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                            {/* Feature Text Info */}
                            <div className="lg:col-span-6 space-y-6">
                                {activeTab === "admin" && (
                                    <>
                                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900">Quản lý Vận hành & Tài chính Đồng bộ</h3>
                                        <p className="text-slate-500 text-base leading-relaxed">
                                            Cung cấp cho Ban giám hiệu công cụ tối cao để thiết lập lịch học, phân quyền nhân sự, và giám sát toàn bộ hoạt động học phí, nợ phí của toàn trường.
                                        </p>
                                        <ul className="space-y-3.5 pt-2">
                                            {[
                                                "Quản lý hồ sơ lớp học, phân công giảng dạy",
                                                "Theo dõi chuyên cần tự động, báo cáo tỷ lệ đi học định kỳ",
                                                "Quản lý học phí trực quan, cảnh báo đóng tiền tự động",
                                                "Dashboard tài chính thống kê thực thu theo tháng/kỳ học"
                                            ].map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600">
                                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {activeTab === "teacher" && (
                                    <>
                                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                            <GraduationCap className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900">Giao bài tiện lợi - Chấm điểm thông minh</h3>
                                        <p className="text-slate-500 text-base leading-relaxed">
                                            Giải phóng giáo viên khỏi gánh nặng thủ công nhờ trợ lý chấm bài tự động. AI phân tích điểm mạnh và khoảng trống kiến thức của học sinh để đưa ra đề xuất bài tập bổ trợ.
                                        </p>
                                        <ul className="space-y-3.5 pt-2">
                                            {[
                                                "Tạo kho học liệu, đề thi trắc nghiệm và tự luận",
                                                "Điểm danh nhanh bằng Mobile web, tự động đồng bộ kết quả",
                                                "AI trợ giúp nhận xét bài tập tự luận dựa trên thang điểm chuẩn",
                                                "Hệ thống phân tích điểm số tự động cảnh báo học sinh yếu kém"
                                            ].map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600">
                                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {activeTab === "student" && (
                                    <>
                                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                            <Laptop className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900">Không gian học trực tuyến hứng khởi</h3>
                                        <p className="text-slate-500 text-base leading-relaxed">
                                            Học sinh có cổng thông tin riêng để làm bài tập, thi thử, nhận feedback tức thì và tự theo dõi tiến độ hoàn thành mục tiêu học tập hàng ngày.
                                        </p>
                                        <ul className="space-y-3.5 pt-2">
                                            {[
                                                "Làm bài kiểm tra online, thi trắc nghiệm chấm điểm ngay",
                                                "Theo dõi lịch học, lịch kiểm tra, thời hạn nộp bài dễ dàng",
                                                "Xem nhận xét chi tiết của giáo viên cho từng bài tự luận",
                                                "Hệ thống tích điểm thưởng, khuyến khích tinh thần tự học"
                                            ].map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600">
                                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {activeTab === "parent" && (
                                    <>
                                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                            <Smartphone className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900">Kết nối tức thì - Đồng hành cùng con</h3>
                                        <p className="text-slate-500 text-base leading-relaxed">
                                            Xóa bỏ hoàn toàn khoảng cách thông tin. Phụ huynh nhận báo cáo chuyên cần lúc con vào lớp và bảng điểm chi tiết trực tiếp trên giao diện di động.
                                        </p>
                                        <ul className="space-y-3.5 pt-2">
                                            {[
                                                "Nhận tin nhắn điểm danh vào lớp/ra về tức thời của con",
                                                "Theo dõi sát sao tiến độ làm bài tập, học lực định kỳ của con",
                                                "Trao đổi trực tiếp, nhận nhận xét của giáo viên chủ nhiệm",
                                                "Thanh toán học phí trực tuyến an toàn qua Stripe hoặc cổng VNPAY"
                                            ].map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600">
                                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>

                            {/* Simulated Feature Preview Screens */}
                            <div className="lg:col-span-6">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 shadow-inner">
                                    {activeTab === "admin" && (
                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/50 space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                <span className="text-xs font-bold text-slate-700">Dòng Tiền Học Phí</span>
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Tháng 6</span>
                                            </div>
                                            <div className="space-y-2.5">
                                                <div>
                                                    <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                                                        <span>Đã thu học phí</span>
                                                        <span className="font-bold text-slate-700">340,500,000đ / 380,000,000đ</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '89.6%' }} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                    <div className="p-2 border border-slate-100 rounded-lg bg-slate-50/50">
                                                        <span className="block text-[9px] font-bold text-slate-400">ĐÃ ĐÓNG (HỌC SINH)</span>
                                                        <span className="text-sm font-extrabold text-emerald-600">312</span>
                                                    </div>
                                                    <div className="p-2 border border-slate-100 rounded-lg bg-slate-50/50">
                                                        <span className="block text-[9px] font-bold text-slate-400">CHƯA ĐÓNG (HỌC SINH)</span>
                                                        <span className="text-sm font-extrabold text-rose-500">36</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "teacher" && (
                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/50 space-y-3">
                                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                                <Sparkles className="h-4 w-4 text-purple-600" />
                                                <span className="text-xs font-bold text-slate-700">AI Nhận Xét Bài Tập Lớp 10A1</span>
                                            </div>
                                            <div className="rounded-lg bg-slate-50 p-2.5 space-y-1.5 border border-slate-100">
                                                <span className="block text-[10px] font-bold text-slate-500">BÀI LÀM CỦA HỌC SINH</span>
                                                <p className="text-[11px] text-slate-700 italic">"...Hàm số đồng biến trên khoảng (-vô cùng; 2) vì đạo hàm y' &gt; 0..."</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="block text-[10px] font-bold text-purple-600 uppercase tracking-wider">AI Gợi Ý Phản Hồi:</span>
                                                <p className="text-[11px] text-slate-600 bg-purple-50/50 p-2 rounded-lg border border-purple-100/50 leading-relaxed">
                                                    Giải đúng phương trình đạo hàm. Tuy nhiên cần bổ sung điều kiện xác định của hàm số phân thức trước khi xét dấu đạo hàm y'. Điểm đánh giá: 8.5/10.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "student" && (
                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/50 space-y-3">
                                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                <span className="text-xs font-bold text-slate-700">Bài Tập Đang Làm</span>
                                                <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-1 rounded">Còn 4 giờ</span>
                                            </div>
                                            <div className="p-3 border border-slate-150 rounded-xl space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-800">Kiểm tra Đại số chương 3</span>
                                                    <span className="text-[10px] text-slate-400">15 Câu trắc nghiệm</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '60%' }} />
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                    <span>Đã làm: 9/15 câu</span>
                                                    <span className="font-semibold text-emerald-600">Tiến độ: 60%</span>
                                                </div>
                                            </div>
                                            <button className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow hover:bg-blue-500">
                                                Tiếp tục làm bài
                                            </button>
                                        </div>
                                    )}

                                    {activeTab === "parent" && (
                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/50 space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <span className="text-xs font-bold text-slate-700">Nhật Ký Học Tập Của Con</span>
                                                <span className="text-[9px] text-slate-400">Hôm nay</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex gap-2.5 items-start">
                                                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 text-xs font-bold">✓</div>
                                                    <div>
                                                        <span className="block text-[11px] font-bold text-slate-700">Điểm danh vào trường</span>
                                                        <span className="block text-[9px] text-slate-400">07:28 sáng - Đúng giờ</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2.5 items-start">
                                                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 text-xs font-bold">10</div>
                                                    <div>
                                                        <span className="block text-[11px] font-bold text-slate-700">Điểm bài kiểm tra 15p Hóa</span>
                                                        <span className="block text-[9px] text-slate-400">10:45 sáng - Đạt điểm 10 tuyệt đối</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Values Section */}
            <section id="values" className="py-20 md:py-28 bg-white border-t border-slate-100">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
                        <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">Giá trị cốt lõi</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
                            Tại sao chọn E-Learning Platform?
                        </h2>
                        <div className="h-1 w-12 bg-blue-600 mx-auto rounded" />
                    </div>

                    {/* Features checklist */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                01
                            </div>
                            <h3 className="text-lg font-bold text-slate-950">Giải pháp may đo, đóng gói khép kín</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Cấp phát tài khoản an toàn tuyệt đối. Không mở đăng ký tự do, hạn chế rủi ro an ninh mạng và rò rỉ dữ liệu học sinh của trường.
                            </p>
                        </div>
                        <div className="space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                02
                            </div>
                            <h3 className="text-lg font-bold text-slate-950">Trợ lý AI chấm bài & phân tích lực học</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Tích hợp mô hình ngôn ngữ lớn để trợ giúp giáo viên chấm điểm tự luận và nhận xét học bạ, giúp tiết giảm 60% thời gian xử lý việc hành chính.
                            </p>
                        </div>
                        <div className="space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                                03
                            </div>
                            <h3 className="text-lg font-bold text-slate-950">Thanh toán & Báo cáo minh bạch</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Tích hợp thanh toán Stripe và VNPAY, gửi biên lai hóa đơn tức thì cho phụ huynh. Ban giám hiệu cập nhật doanh thu và biến động trực quan.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. Pricing CTA Form Section */}
            <section id="contact" className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-blue-50/40 border-t border-slate-200/50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        
                        {/* Info Column */}
                        <div className="lg:col-span-5 space-y-6">
                            <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">Liên hệ và Báo giá</span>
                            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight leading-[1.15]">
                                Khởi động tiến trình số hóa trường học ngay hôm nay
                            </h2>
                            <p className="text-slate-500 text-base leading-relaxed">
                                Hãy chia sẻ thông tin về tổ chức của bạn. Đội ngũ kỹ sư và chuyên viên tư vấn giáo dục của chúng tôi sẽ liên hệ trong 24h để khảo sát chi tiết và thiết lập hệ thống thử nghiệm cho nhà trường.
                            </p>

                            {/* Contact Info list */}
                            <div className="space-y-4 pt-4 border-t border-slate-200">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Phone className="h-5 w-5 text-blue-600" />
                                    <span className="text-sm font-semibold">Hotline hỗ trợ: (+84) 1900 8888</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail className="h-5 w-5 text-blue-600" />
                                    <span className="text-sm font-semibold">Email kinh doanh: sales@edtech-lms.com</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <MapPin className="h-5 w-5 text-blue-600" />
                                    <span className="text-sm font-semibold">Trụ sở: Tòa nhà TechHub, Cầu Giấy, Hà Nội</span>
                                </div>
                            </div>
                        </div>

                        {/* Form Column */}
                        <div className="lg:col-span-7">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50">
                                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-blue-600" /> Đăng ký nhận báo giá & Demo
                                </h3>
                                
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    
                                    {/* School Name & Representative */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label htmlFor="schoolName" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Tên trường / Trung tâm <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="schoolName"
                                                name="schoolName"
                                                required
                                                value={formData.schoolName}
                                                onChange={handleChange}
                                                placeholder="Trường THCS/THPT Sao Mai"
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="contactName" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Người đại diện liên hệ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="contactName"
                                                name="contactName"
                                                required
                                                value={formData.contactName}
                                                onChange={handleChange}
                                                placeholder="Nguyễn Văn A"
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    </div>

                                    {/* Email & Phone */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Email công tác <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="nguyenvana@school.edu.vn"
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="phone" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Số điện thoại liên hệ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                id="phone"
                                                name="phone"
                                                required
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="0912345678"
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    </div>

                                    {/* School Size */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="schoolSize" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Quy mô học sinh toàn trường <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="schoolSize"
                                            name="schoolSize"
                                            required
                                            value={formData.schoolSize}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="" disabled>-- Chọn quy mô học sinh --</option>
                                            <option value="under_100">Dưới 100 học sinh</option>
                                            <option value="100_500">Từ 100 đến 500 học sinh</option>
                                            <option value="500_1000">Từ 500 đến 1000 học sinh</option>
                                            <option value="above_1000">Trên 1000 học sinh</option>
                                        </select>
                                    </div>

                                    {/* Message */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="message" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Lời nhắn hoặc yêu cầu tùy chỉnh thêm
                                        </label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            rows={3}
                                            value={formData.message}
                                            onChange={handleChange}
                                            placeholder="Ghi rõ thời gian rảnh tiện nghe điện thoại, yêu cầu tính năng riêng..."
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/15 hover:shadow-blue-500/30 hover:from-blue-50 hover:to-indigo-50 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Đang gửi yêu cầu...
                                            </>
                                        ) : (
                                            <>
                                                Đăng ký tư vấn miễn phí & Báo giá
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 7. Footer */}
            <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center border-b border-slate-800 pb-8">
                        {/* Logo */}
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600">
                                <GraduationCap className="h-5.5 w-5.5 text-white" />
                            </div>
                            <div>
                                <span className="text-lg font-bold tracking-tight text-white">
                                    E-Learning Platform
                                </span>
                                <span className="block text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                                    B2B School Solution
                                </span>
                            </div>
                        </div>

                        {/* Navlinks */}
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <button onClick={() => scrollToSection("pain-points")} className="text-sm hover:text-white transition-colors cursor-pointer">Nỗi đau</button>
                            <button onClick={() => scrollToSection("solutions")} className="text-sm hover:text-white transition-colors cursor-pointer">Giải pháp</button>
                            <button onClick={() => scrollToSection("values")} className="text-sm hover:text-white transition-colors cursor-pointer">Giá trị</button>
                            <button onClick={() => scrollToSection("contact")} className="text-sm hover:text-white transition-colors cursor-pointer">Liên hệ</button>
                            <Link href="/login" className="text-sm hover:text-white transition-colors">Đăng nhập</Link>
                        </div>

                        {/* Copy details */}
                        <div className="md:text-right text-xs text-slate-500">
                            Nền tảng đóng dành riêng cho đối tác giáo dục.
                            <br />
                            Tài khoản truy cập do Nhà trường cấp.
                        </div>
                    </div>

                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                        <p>© 2026 E-Learning Platform. All rights reserved. Phát triển bởi Google DeepMind Partner.</p>
                        <div className="flex gap-4">
                            <a href="#" className="hover:underline">Điều khoản dịch vụ</a>
                            <a href="#" className="hover:underline">Chính sách bảo mật</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
