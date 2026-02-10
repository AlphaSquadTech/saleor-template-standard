import { gql } from '@apollo/client';

export const PAYMENT_GATEWAY_INITIALIZE = gql`
  mutation PaymentGatewayInitialize(
    $checkoutId: ID!
    $amount: PositiveDecimal!
    $paymentGateways: [PaymentGatewayToInitialize!]!
  ) {
    paymentGatewayInitialize(
      id: $checkoutId
      amount: $amount
      paymentGateways: $paymentGateways
    ) {
      gatewayConfigs {
        id
        data
        errors {
          field
          message
          code
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export interface PaymentGatewayInitializeVars {
  checkoutId: string;
  amount: number;
  paymentGateways: Array<{
    id: string;
    data?: Record<string, unknown>;
  }>;
}

export interface PaymentGatewayInitializeData {
  paymentGatewayInitialize: {
    gatewayConfigs: Array<{
      id: string;
      data: Record<string, unknown> | null;
      errors: Array<{
        field: string | null;
        message: string;
        code: string;
      }>;
    }>;
    errors: Array<{
      field: string | null;
      message: string;
      code: string;
    }>;
  };
}