import type { ValidationErrorDetail } from "@hotel/shared";
import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";

export function applyServerValidationDetails<TFieldValues extends FieldValues>(
  details: readonly ValidationErrorDetail[],
  allowedFields: readonly FieldPath<TFieldValues>[],
  setError: UseFormSetError<TFieldValues>,
): boolean {
  let applied = false;
  for (const detail of details) {
    const fieldName = detail.field as FieldPath<TFieldValues>;
    if (allowedFields.includes(fieldName)) {
      setError(fieldName, { type: "server", message: detail.message });
      applied = true;
    }
  }
  return applied;
}
