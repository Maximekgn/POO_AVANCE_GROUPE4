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

// Formatte un montant en FCFA
const formatFcfa = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M FCFA`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K FCFA`;
  }
  return `${value} FCFA`;
};

export const RevenueHistoryChart = ({ data }: { data: RevenueHistory }) => {
  const [activeTab, setActiveTab] = useState<"daily" | "monthly" | "yearly">(
    "monthly",
  );

  const currentData = data[activeTab] || [];

  // Calcul du total pour la période sélectionnée
  const totalAmount = currentData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Tab controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              activeTab === "daily"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Par Jours
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              activeTab === "monthly"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Par Mois
          </button>
          <button
            onClick={() => setActiveTab("yearly")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              activeTab === "yearly"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Par Années
          </button>
        </div>

        {/* Total affiché */}
        <div className="text-right">
          <p className="text-xs text-neutral-500">Total période</p>
          <p className="text-lg font-bold text-emerald-600">
            {formatFcfa(totalAmount)}
          </p>
        </div>
      </div>

      <div className="h-[300px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={currentData}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f0f0f0"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666", fontSize: 11 }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666", fontSize: 11 }}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              }}
            />
            <Tooltip
              cursor={{ fill: "#f0fdf4" }}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                backgroundColor: "white",
              }}
              formatter={(value: number) => [
                `${value.toLocaleString("fr-FR")} FCFA`,
                "Encaissement",
              ]}
              labelStyle={{ fontWeight: "600", marginBottom: "8px" }}
            />
            <Bar
              dataKey="amount"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              name="Encaissements (FCFA)"
            >
              {currentData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.amount > 0 ? "#10b981" : "#e5e7eb"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
          <span>Loyers encaissés</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gray-200"></div>
          <span>Aucun encaissement</span>
        </div>
      </div>
    </div>
  );
};

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

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
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
