"use client";

import { FieldValues, UseFormRegister } from "react-hook-form";

interface RoleSelectProps {
  id: string;
  label: string;
  disabled?: boolean;
  required?: boolean;
  register: UseFormRegister<FieldValues>;
  errors: any;
}

const RoleSelect: React.FC<RoleSelectProps> = ({
  id,
  label,
  disabled,
  required,
  register,
  errors,
}) => {
  return (
    <div className="w-full relative">
      <select
        id={id}
        disabled={disabled}
        {...register(id, { required })}
        className={`
          peer
          w-full
          p-4
          pt-6
          font-light
          bg-white
          border-2
          rounded-md
          outline-none
          transition
          disabled:opacity-70
          disabled:cursor-not-allowed
          ${errors[id] ? "border-red-500" : "border-neutral-300"}
          ${errors[id] ? "focus:border-red-500" : "focus:border-neutral-400"}
        `}
      >
        <option value="CLIENT">Client</option>
        <option value="PROPRIETAIRE">Propriétaire</option>
      </select>
      <label
        className={`
        absolute
        text-md
        duration-150
        transform
        -translate-y-3
        top-5
        z-10
        origin-[0]
        left-4
        scale-75
        ${errors[id] ? "text-rose-500" : "text-zinc-400"}
        `}
      >
        {label}
      </label>
    </div>
  );
};

export default RoleSelect;
