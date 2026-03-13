import { useState } from 'react';

type ValidationRules = {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  min?: number;
  custom?: (value: any) => boolean;
};

type Schema<T> = Partial<Record<keyof T, ValidationRules>>;

export const useFormValidation = <T extends Record<string, any>>(initialState: T, schema: Schema<T>) => {
  const [values, setValues] = useState<T>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validate = (field: keyof T, value: any): string => {
    const rules = schema[field];
    if (!rules) return '';

    if (rules.required && !value) return 'Required field';
    if (rules.required && typeof value === 'string' && !value.trim()) return 'Required field';
    if (rules.pattern && !rules.pattern.test(value)) return 'Invalid format';
    if (rules.minLength && String(value).length < rules.minLength) return `Min ${rules.minLength} chars`;
    if (rules.min !== undefined && Number(value) < rules.min) return `Min value is ${rules.min}`;
    if (rules.custom && !rules.custom(value)) return 'Invalid value';

    return '';
  };

  const handleChange = (field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Validate immediately on change
    const error = validate(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // isValid is now a pure function that checks validity without causing side effects.
  const isValid = () => {
    let valid = true;
    for (const key of Object.keys(schema) as Array<keyof T>) {
        if (validate(key, values[key])) {
            valid = false;
            break; 
        }
    }
    return valid;
  };

  const resetForm = () => {
      setValues(initialState);
      setErrors({});
  }

  return { values, errors, handleChange, isValid, setValues, resetForm };
};
