import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/*
  IsoDatePicker
  Props:
    value: ISO string (YYYY-MM-DD) or ''
    onChange: (isoString) => void
    minYear, maxYear (optional)
*/
export default function IsoDatePicker({
  value,
  onChange,
  minYear = 1950,
  maxYear = new Date().getFullYear(),
  placeholder = "Select date",
}) {
  const parsedDate =
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(value + "T00:00:00")
      : null;

  const handleChange = (date) => {
    if (!date) return onChange("");
    const iso = date.toISOString().slice(0, 10); // YYYY-MM-DD
    onChange(iso);
  };

  // Prevent selecting future dates: cap to today
  const today = new Date();
  const computedMaxDate = today;

  return (
    <div className="relative w-full">
      <DatePicker
        selected={parsedDate}
        onChange={handleChange}
        placeholderText={placeholder}
        className="w-full h-[52px] px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700 placeholder-gray-400"
        wrapperClassName="w-full"
        calendarClassName="!text-sm"
        popperClassName="shadow-lg"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        minDate={new Date(minYear, 0, 1)}
        maxDate={computedMaxDate}
        dateFormat="yyyy-MM-dd"
      />
    </div>
  );
}
