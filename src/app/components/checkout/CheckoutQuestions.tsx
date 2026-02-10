"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@apollo/client";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import ReCAPTCHA from "react-google-recaptcha";
import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";
import { 
  GET_CHECKOUT_QUESTIONS, 
  type CheckoutQuestionsData, 
  parseCheckoutQuestions,
  type ParsedQuestion 
} from "@/graphql/queries/getCheckoutQuestions";
import { 
  UPDATE_CHECKOUT_METADATA,
  type UpdateCheckoutMetadataData,
  type UpdateCheckoutMetadataVariables 
} from "@/graphql/mutations/updateCheckoutMetadata";
import { useMutation } from "@apollo/client";

interface CheckoutQuestionsProps {
  isLoggedIn: boolean;
  grandTotal: number;
  checkoutId?: string;
  onQuestionsChange?: (answers: Record<string, string>) => void;
  onValidationChange?: (isValid: boolean) => void;
  onSaveQuestions?: (saveFunction: () => Promise<void>) => void;
}

interface QuestionFieldProps {
  question: ParsedQuestion;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function QuestionField({ question, value, onChange, error }: QuestionFieldProps) {
  const fieldId = `question-${question.id}`;
  
  const baseInputClasses = `w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors ${
    error 
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 hover:border-gray-400'
  }`;

  if (question.type === 'text') {
    return (
      <div className="space-y-2">
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
          {question.question}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInputClasses} min-h-[80px] outline-none resize-vertical`}
          placeholder={`Enter your answer${question.required ? ' (required)' : ''}`}
          required={question.required}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (question.type === 'select' && question.options) {
    return (
      <div className="space-y-2">
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
          {question.question}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
          required={question.required}
        >
          <option value="">Please select an option{question.required ? ' (required)' : ''}</option>
          {question.options.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (question.type === 'radio' && question.options) {
    return (
      <div className="space-y-3">
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </legend>
          <div className="mt-2 space-y-2">
            {question.options.map((option, index) => (
              <label 
                key={index} 
                className={`flex items-center gap-3 ring-1 p-3 cursor-pointer rounded transition-colors ${
                  value === option
                    ? "ring-[var(--color-primary-100)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                    : "ring-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={fieldId}
                  value={option}
                  checked={value === option}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-4 w-4 text-[var(--color-primary-600)] border-gray-300 focus:ring-[var(--color-primary-500)] accent-[var(--color-primary-600)]"
                  required={question.required}
                />
                <span className="text-sm flex-1">{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return null;
}

export default function CheckoutQuestions({ 
  isLoggedIn, 
  grandTotal,
  checkoutId,
  onQuestionsChange,
  onValidationChange,
  onSaveQuestions
}: CheckoutQuestionsProps) {
  const { data, loading, error } = useQuery<CheckoutQuestionsData>(GET_CHECKOUT_QUESTIONS, {
    fetchPolicy: "cache-first"
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [_isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null);
  const { recaptchaRef, getRecaptchaToken, resetRecaptcha } = useRecaptcha();
  const config = useAppConfiguration();
  const onValidationChangeRef = useRef(onValidationChange);
  
  // Mutation for saving checkout questions as metadata
  const [updateCheckoutMetadata] = useMutation<UpdateCheckoutMetadataData, UpdateCheckoutMetadataVariables>(
    UPDATE_CHECKOUT_METADATA
  );
  
  // Update ref when callback changes
  useEffect(() => {
    onValidationChangeRef.current = onValidationChange;
  });

  const questionsConfig = useMemo(() => {
    return data ? parseCheckoutQuestions(data) : null;
  }, [data]);

  // Save questions as metadata when payment is initiated
  const saveQuestionsAsMetadata = useCallback(async () => {
    if (!checkoutId || !questionsConfig?.questions.length) {
      console.log('[CheckoutQuestions] No checkout ID or questions to save');
      return;
    }

    // Convert answers to metadata format: question-1, answer-1, question-2, answer-2, etc.
    const metadataInput: { key: string; value: string }[] = [];
    questionsConfig.questions.forEach((question, index) => {
      const questionNumber = index + 1;
      const answer = answers[question.id]?.trim() || '';
      
      metadataInput.push(
        { key: `question-${questionNumber}`, value: question.question },
        { key: `answer-${questionNumber}`, value: answer }
      );
    });

    if (metadataInput.length === 0) {
      console.log('[CheckoutQuestions] No answers to save');
      return;
    }

    try {
      const result = await updateCheckoutMetadata({
        variables: {
          id: checkoutId,
          input: metadataInput
        }
      });

      if (result.data?.updateMetadata?.errors?.length) {
        const errorMessage = result.data.updateMetadata.errors[0].message;
        console.error('[CheckoutQuestions] Error saving questions:', errorMessage);
        throw new Error(`Failed to save questions: ${errorMessage}`);
      }

      console.log('[CheckoutQuestions] Questions saved successfully');
    } catch (error) {
      console.error('[CheckoutQuestions] Error saving questions:', error);
      throw error;
    }
  }, [checkoutId, questionsConfig, answers, updateCheckoutMetadata]);

  // Expose save function to parent component
  useEffect(() => {
    if (onSaveQuestions) {
      onSaveQuestions(saveQuestionsAsMetadata);
    }
  }, [onSaveQuestions, saveQuestionsAsMetadata]);

  const shouldShowQuestions = useCallback(() => {
    if (!questionsConfig?.isPublished) return false;
    
    // Check guest-only restriction
    if (questionsConfig.guestOnly && isLoggedIn) return false;
    
    // Check order value threshold  
    if (questionsConfig.orderValueThreshold && grandTotal < questionsConfig.orderValueThreshold) return false;
    
    return true;
  }, [questionsConfig, isLoggedIn, grandTotal]);

  const validateAnswers = useCallback(() => {
    if (!questionsConfig) return true;
    
    const errors: Record<string, string> = {};
    let hasErrors = false;

    questionsConfig.questions.forEach(question => {
      const answer = answers[question.id]?.trim() || '';
      
      if (question.required && !answer) {
        errors[question.id] = 'This field is required';
        hasErrors = true;
      }
    });

    // Check reCAPTCHA validation if enabled
    if (questionsConfig.showReCAPTCHA && !recaptchaValue) {
      errors.recaptcha = 'Please complete the reCAPTCHA verification';
      hasErrors = true;
    }

    return !hasErrors;
  }, [questionsConfig, answers, recaptchaValue]);

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: value };
      return updated;
    });

    // Clear validation error when user starts typing
    setValidationErrors(prev => {
      if (prev[questionId]) {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      }
      return prev;
    });
  }, []);

  // Call onQuestionsChange in useEffect to avoid state update during render
  useEffect(() => {
    if (onQuestionsChange) {
      onQuestionsChange(answers);
    }
  }, [answers, onQuestionsChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = validateAnswers();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute reCAPTCHA if enabled
      if (questionsConfig?.showReCAPTCHA) {
        const recaptchaToken = await getRecaptchaToken();
        if (!recaptchaToken) {
          resetRecaptcha();
          throw new Error('reCAPTCHA verification failed. Please try again.');
        }
      }

      // Here you would typically submit the answers to your backend
      console.log('Checkout questions answers:', answers);
      
      // Reset reCAPTCHA after successful submission
      if (questionsConfig?.showReCAPTCHA) {
        resetRecaptcha();
      }
      
    } catch (error) {
      console.error('Failed to submit checkout questions:', error);
      if (questionsConfig?.showReCAPTCHA) {
        resetRecaptcha();
      }
      // Handle submission error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update validation state when answers or questions change
  useEffect(() => {
    if (!questionsConfig || questionsConfig.questions.length === 0) {
      onValidationChangeRef.current?.(true);
      return;
    }
    
    const errors: Record<string, string> = {};
    let hasErrors = false;

    questionsConfig.questions.forEach(question => {
      const answer = answers[question.id]?.trim() || '';
      
      if (question.required && !answer) {
        errors[question.id] = 'This field is required';
        hasErrors = true;
      }
    });

    // Check reCAPTCHA validation if enabled
    if (questionsConfig.showReCAPTCHA && !recaptchaValue) {
      errors.recaptcha = 'Please complete the reCAPTCHA verification';
      hasErrors = true;
    }

    // Only update errors if they've actually changed
    setValidationErrors(prevErrors => {
      const errorsChanged = JSON.stringify(prevErrors) !== JSON.stringify(errors);
      return errorsChanged ? errors : prevErrors;
    });
    
    const isValid = !hasErrors;
    onValidationChangeRef.current?.(isValid);
  }, [answers, questionsConfig, recaptchaValue]);

  // Handle validation when questions are not shown due to conditions
  useEffect(() => {
    if (!shouldShowQuestions() || !questionsConfig) {
      // When questions are not shown, consider validation as passed
      onValidationChangeRef.current?.(true);
    }
  }, [questionsConfig, shouldShowQuestions]);

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold font-secondary text-[var(--color-secondary-800)] mb-3 uppercase">
            Questions
          </h2>
          <p className="text-sm text-[var(--color-secondary-600)]">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Check if questions should be shown based on configuration
  if (!shouldShowQuestions() || !questionsConfig) {
    return null;
  }

  if (error) {
    console.warn('Failed to load checkout questions:', error);
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold font-secondary text-[var(--color-secondary-800)] mb-3 uppercase">
            Questions
          </h2>
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            <p>Error loading questions: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold font-secondary text-gray-800 mb-3 md:mb-5 uppercase">
          Questions
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Please answer the following questions to help us improve your experience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          {questionsConfig.questions.map(question => (
            <QuestionField
              key={question.id}
              question={question}
              value={answers[question.id] || ''}
              onChange={(value) => handleAnswerChange(question.id, value)}
              error={validationErrors[question.id]}
            />
          ))}

          {questionsConfig.showReCAPTCHA && (
            <div className="flex flex-col items-start py-4">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={config.getGoogleRecaptchaConfig()?.site_key || ''}
                theme="light"
                size="normal"
                onChange={(value) => {
                  setRecaptchaValue(value);
                  // Clear recaptcha error when user completes it
                  if (value && validationErrors.recaptcha) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.recaptcha;
                      return newErrors;
                    });
                  }
                }}
                onExpired={() => {
                  setRecaptchaValue(null);
                  resetRecaptcha();
                }}
                onError={() => {
                  setRecaptchaValue(null);
                  resetRecaptcha();
                }}
              />
              {validationErrors.recaptcha && (
                <p className="text-red-500 text-xs mt-2 text-center">
                  {validationErrors.recaptcha}
                </p>
              )}
            </div>
          )}
        </form>
    </div>
  );
}