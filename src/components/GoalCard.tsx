import React from "react";

type Props = {
  id: string;
  title: string;
  category: string;
  target_amount: number;
  current_total: number;
  deadline: string;
  onEdit: (goal: any) => void;
  onDelete: (id: string) => void;
};

export default function GoalCard({
  id,
  title,
  category,
  target_amount,
  current_total,
  deadline,
  onEdit,
  onDelete,
}: Props) {
  const percent = Math.min(100, Math.round((current_total / target_amount) * 100));

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-2 relative">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="space-x-2 text-xs text-blue-600">
          <button onClick={() => onEdit({ id, title, category, target_amount, deadline })}>Edit</button>
          <button onClick={() => onDelete(id)} className="text-red-500">Delete</button>
        </div>
      </div>
      <p className="text-sm text-gray-500">Category: {category} • Deadline: {deadline}</p>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className="bg-green-500 h-full" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm">
        ${current_total.toFixed(2)} / ${target_amount.toFixed(2)} ({percent}%)
      </p>
    </div>
  );
} 
