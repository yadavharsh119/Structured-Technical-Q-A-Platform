'use client';
import { useState, useCallback } from 'react';

/**
 * Generic form state management hook with validation support.
 *
 * @param {Object} initialValues - Initial field values
 * @param {Function} validateFn  - Validation function that returns { isValid, errors }
 */
export function useForm(initialValues = {}, validateFn = null) {
  const [values,  setValues]  = useState(initialValues);
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    // Run field-level validation on blur
    if (validateFn) {
      const { errors: newErrors } = validateFn(values);
      if (newErrors[name]) {
        setErrors(prev => ({ ...prev, [name]: newErrors[name] }));
      }
    }
  }, [values, validateFn]);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  }, [errors]);

  const setFieldError = useCallback((name, message) => {
    setErrors(prev => ({ ...prev, [name]: message }));
  }, []);

  const validate = useCallback(() => {
    if (!validateFn) return true;
    const { isValid, errors: newErrors } = validateFn(values);
    setErrors(newErrors);
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);
    return isValid;
  }, [values, validateFn]);

  const handleSubmit = useCallback((onSubmit) => async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }, [values, validate]);

  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setSubmitting(false);
  }, [initialValues]);

  // Determine which errors to show (only touched fields)
  const visibleErrors = Object.keys(errors).reduce((acc, key) => {
    if (touched[key]) acc[key] = errors[key];
    return acc;
  }, {});

  return {
    values,
    errors: visibleErrors,
    allErrors: errors,
    touched,
    submitting,
    handleChange,
    handleBlur,
    setValue,
    setFieldError,
    validate,
    handleSubmit,
    reset,
    setValues,
  };
}
