"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useState } from "react";

interface RevenueHistoryData {
  label: string;
  amount: number;
}

interface RevenueHistory {
  daily: RevenueHistoryData[];
  monthly: RevenueHistoryData[];
  yearly: RevenueHistoryData[];
}

interface CategoryStat {
  name: string;
  value: number;
}

export const RevenueHistoryChart = ({ data }: { data: RevenueHistory }) => {
  const [activeTab, setActiveTab] = useState<"daily" | "monthly" | "yearly">("monthly");

  const currentData = data[activeTab] || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Tab controls */}
      <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg w-max">
        <button
          onClick={() => setActiveTab("daily")}
          className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === "daily" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
        >
          Par Jours
        </button>
        <button
          onClick={() => setActiveTab("monthly")}
          className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === "monthly" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
        >
          Par Mois
        </button>
        <button
          onClick={() => setActiveTab("yearly")}
          className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === "yearly" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
        >
          Par Années
        </button>
      </div>

      <div className="h-[300px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={currentData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666", fontSize: 12 }}
              tickFormatter={(value) => `${value} FCFA`}
            />
            <Tooltip
              cursor={{ fill: "#f8f8f8" }}
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <Bar
              dataKey="amount"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              name="Revenus (FCFA)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export const CategoryPieChart = ({ data }: { data: CategoryStat[] }) => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
