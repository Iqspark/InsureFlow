"use client";

import { Question } from "@/types";
import ChoiceInput from "./inputs/ChoiceInput";
import ToggleInput from "./inputs/ToggleInput";
import TextInput from "./inputs/TextInput";
import NumberInput from "./inputs/NumberInput";
import CurrencyInput from "./inputs/CurrencyInput";
import DropdownInput from "./inputs/DropdownInput";
import DateInput from "./inputs/DateInput";
import AddressInput from "./inputs/AddressInput";

type Extra = Record<string, { value: string | number | boolean; displayValue: string }>;

interface Props {
  question: Question;
  // Existing answer value, used to pre-fill the input when going back to edit.
  initialValue?: string | number | boolean;
  onSubmit: (value: string | number | boolean, displayValue: string, extra?: Extra) => void;
}

export default function InputRenderer({ question, initialValue, onSubmit }: Props) {
  const submit = (v: string | number | boolean, d: string, extra?: Extra) => onSubmit(v, d, extra);
  const asString = initialValue != null ? String(initialValue) : undefined;
  const asNumber =
    typeof initialValue === "number"
      ? initialValue
      : initialValue != null && initialValue !== "" && !isNaN(Number(initialValue))
      ? Number(initialValue)
      : undefined;

  switch (question.type) {
    case "choice":
      return (
        <ChoiceInput
          options={question.options ?? []}
          selected={initialValue}
          onSelect={(v, d) => submit(v, d)}
        />
      );

    case "toggle":
      return (
        <ToggleInput
          options={question.options ?? []}
          selected={initialValue}
          onSelect={(v, d) => submit(v, d)}
        />
      );

    case "dropdown":
      return (
        <DropdownInput
          options={question.options ?? []}
          placeholder={question.placeholder}
          initialValue={initialValue}
          onSelect={(v, d) => submit(v, d)}
        />
      );

    case "number":
      return (
        <NumberInput
          placeholder={question.placeholder}
          min={question.min}
          max={question.max}
          suffix={question.suffix}
          mustBeInteger={question.mustBeInteger}
          noGrouping={question.noGrouping}
          initialValue={asString}
          onSubmit={(v, d) => submit(v, d)}
        />
      );

    case "currency":
      return (
        <CurrencyInput
          placeholder={question.placeholder}
          min={question.min}
          max={question.max}
          initialValue={asNumber}
          onSubmit={(v, d) => submit(v, d)}
        />
      );

    case "address":
      return (
        <AddressInput
          placeholder={question.placeholder}
          initialValue={asString}
          onSubmit={(v, d, extra) => submit(v, d, extra)}
        />
      );

    case "date":
      return <DateInput initialValue={asString} onSubmit={(v, d) => submit(v, d)} />;

    case "text":
    default:
      return (
        <TextInput
          placeholder={question.placeholder}
          required={question.required}
          inputType={question.inputType}
          minLength={question.minLength}
          maxLength={question.maxLength}
          initialValue={asString}
          onSubmit={(v, d) => submit(v, d)}
        />
      );
  }
}
