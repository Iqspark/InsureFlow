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

interface Props {
  question: Question;
  onSubmit: (value: string | number | boolean, displayValue: string) => void;
}

export default function InputRenderer({ question, onSubmit }: Props) {
  const submit = (v: string | number | boolean, d: string) => onSubmit(v, d);

  switch (question.type) {
    case "choice":
      return (
        <ChoiceInput
          options={question.options ?? []}
          onSelect={(v, d) => submit(v, d)}
        />
      );

    case "toggle":
      return (
        <ToggleInput
          options={question.options ?? []}
          onSelect={(v, d) => submit(v, d)}
        />
      );

    case "dropdown":
      return (
        <DropdownInput
          options={question.options ?? []}
          placeholder={question.placeholder}
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
          onSubmit={(v, d) => submit(v, d)}
        />
      );

    case "currency":
      return (
        <CurrencyInput
          placeholder={question.placeholder}
          min={question.min}
          max={question.max}
          onSubmit={(v, d) => submit(v, d)}
        />
      );

    case "address":
      return (
        <AddressInput
          placeholder={question.placeholder}
          onSubmit={(v, d) => submit(v, d)}
        />
      );

    case "date":
      return <DateInput onSubmit={(v, d) => submit(v, d)} />;

    case "text":
    default:
      return (
        <TextInput
          placeholder={question.placeholder}
          required={question.required}
          inputType={question.inputType}
          minLength={question.minLength}
          maxLength={question.maxLength}
          onSubmit={(v, d) => submit(v, d)}
        />
      );
  }
}
