"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AnalyticsTabsClientProps {
    children: React.ReactNode[];
    tabs: { label: string; icon: string }[];
}

export default function AnalyticsTabsClient({ children, tabs }: AnalyticsTabsClientProps) {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div>
            {/* Tab navigation */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 shadow-sm">
                {tabs.map((tab, idx) => (
                    <Button
                        key={idx}
                        variant={activeTab === idx ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveTab(idx)}
                        className={`flex-1 text-xs font-semibold transition-all ${
                            activeTab === idx
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        {tab.icon} {tab.label}
                    </Button>
                ))}
            </div>

            {/* Tab content */}
            {children[activeTab]}
        </div>
    );
}
