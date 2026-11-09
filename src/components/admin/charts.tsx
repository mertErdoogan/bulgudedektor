"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmt = (v: number) => (v >= 1000 ? `${Math.round(v / 1000).toLocaleString("tr-TR")}b` : String(v));
const tl = (v: number) => `${Math.round(v).toLocaleString("tr-TR")} TL`;

export function SalesChart({ data, money = true }: { data: { label: string; value: number; orders: number }[]; money?: boolean }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d42e1e" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#d42e1e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#646e78" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={{ fontSize: 11, fill: "#646e78" }} tickLine={false} axisLine={false} width={44} tickFormatter={money ? fmt : undefined} allowDecimals={false} />
          <Tooltip
            formatter={(v, name) => (name === "value" ? [money ? tl(Number(v)) : Number(v), money ? "Ciro" : "Sipariş"] : [Number(v), "Sipariş"])}
            labelStyle={{ fontWeight: 700 }}
            contentStyle={{ borderRadius: 10, border: "1px solid #e4e6e8", fontSize: 13 }}
          />
          <Area type="monotone" dataKey={money ? "value" : "orders"} stroke="#d42e1e" strokeWidth={2} fill="url(#g)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarList({ data, money = true }: { data: { label: string; value: number }[]; money?: boolean }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#646e78" }} tickFormatter={money ? fmt : undefined} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 12, fill: "#1d1d1f" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [money ? tl(Number(v)) : Number(v), money ? "Ciro" : "Adet"]} contentStyle={{ borderRadius: 10, border: "1px solid #e4e6e8", fontSize: 13 }} />
          <Bar dataKey="value" fill="#d42e1e" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
