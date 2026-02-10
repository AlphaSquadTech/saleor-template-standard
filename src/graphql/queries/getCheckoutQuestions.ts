import { gql } from "@apollo/client";

export const GET_CHECKOUT_QUESTIONS = gql`
  query GetCheckoutQuestions {
    page(slug: "checkout-question") {
      id
      title
      slug
      content
      seoTitle
      seoDescription
      isPublished
      metadata {
        key
        value
      }
    }
  }
`;

export interface CheckoutQuestionMetadata {
  key: string;
  value: string;
}

export interface CheckoutQuestionsData {
  page: {
    id: string;
    title: string;
    slug: string;
    content: string | null;
    seoTitle: string;
    seoDescription: string;
    isPublished: boolean;
    metadata: CheckoutQuestionMetadata[];
  } | null;
}

export interface ParsedQuestion {
  id: string;
  required: boolean;
  question: string;
  options?: string[];
  type: 'text' | 'select' | 'radio' | 'checkbox';
}

export interface CheckoutQuestionsConfig {
  isPublished: boolean;
  guestOnly: boolean;
  orderValueThreshold: number | null;
  showReCAPTCHA: boolean;
  questions: ParsedQuestion[];
}

export function parseCheckoutQuestions(data: CheckoutQuestionsData): CheckoutQuestionsConfig | null {
  if (!data?.page) {
    return null;
  }
  
  if (!data.page.isPublished) {
    return null;
  }

  const metadata = data.page.metadata;
  const questions: ParsedQuestion[] = [];
  
  let guestOnly = false;
  let orderValueThreshold: number | null = null;
  let showReCAPTCHA = false;

  metadata.forEach(({ key, value }) => {
    if (key === 'guest_only') {
      guestOnly = value === 'true';
    } else if (key === 'order_value') {
      const parsed = parseFloat(value);
      orderValueThreshold = isNaN(parsed) ? null : parsed;
    } else if (key === 'reCAPTCHA') {
      showReCAPTCHA = value === 'true';
    } else if (key.startsWith('question-')) {
      const questionId = key;
      const parts = value.split(':');
      
      if (parts.length >= 2) {
        const requiredStr = parts[0].trim();
        const required = requiredStr === 'r';
        const question = parts[1].trim();
        
        // Handle options - check if parts[2] exists and is not empty
        let options: string[] | undefined = undefined;
        if (parts.length > 2 && parts[2].trim()) {
          options = parts[2].split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
        }
        
        // Only add question if it has a question text
        if (question) {
          questions.push({
            id: questionId,
            required,
            question,
            options,
            type: options && options.length > 0 ? (options.length <= 4 ? 'radio' : 'select') : 'text'
          });
        }
      }
    }
  });

  return {
    isPublished: data.page.isPublished,
    guestOnly,
    orderValueThreshold,
    showReCAPTCHA,
    questions: questions.sort((a, b) => a.id.localeCompare(b.id))
  };
}