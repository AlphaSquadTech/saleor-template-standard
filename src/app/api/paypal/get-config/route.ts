import { NextRequest, NextResponse } from "next/server";

// Types for PayPal Gateway Configuration
interface GatewayError {
  field: string | null;
  message: string;
  code: string;
}

interface PayPalData {
  paypalClientId: string;  // Partner client ID (pk)
  merchantClientId?: string;
  merchantId?: string | null;
  paymentMethodReadiness?: {
    applePay: boolean;
    googlePay: boolean;
    paypalButtons: boolean;
    advancedCardProcessing: boolean;
    vaulting: boolean;
  };
}

interface GatewayConfig {
  id: string;
  data: PayPalData | null;
  errors: GatewayError[];
}

interface PaymentGatewayInitializeResponse {
  data?: {
    paymentGatewayInitialize?: {
      gatewayConfigs: GatewayConfig[];
      errors: GatewayError[];
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * API Route: Get PayPal Configuration
 *
 * Fetches PayPal client ID and merchant ID from Saleor's paymentGatewayInitialize
 * mutation. This is the proper way to get payment gateway configuration dynamically
 * instead of hardcoding credentials.
 *
 * @route POST /api/paypal/get-config
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutId, amount } = body;

    // Validate required parameters
    if (!checkoutId) {
      return NextResponse.json(
        { error: "Missing checkoutId parameter" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount parameter" },
        { status: 400 }
      );
    }

    // Get Saleor API URL from environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error("❌ NEXT_PUBLIC_API_URL not configured");
      return NextResponse.json(
        { error: "Saleor API URL not configured" },
        { status: 500 }
      );
    }

    // Get auth token from cookies
    const token = request.cookies.get("token")?.value;

    // GraphQL mutation to initialize payment gateway
    const PAYMENT_GATEWAY_INITIALIZE = `
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

    // Prepare headers
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Call Saleor API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: PAYMENT_GATEWAY_INITIALIZE,
        variables: {
          checkoutId,
          amount: amount.toString(),
          paymentGateways: [
            {
              id: "saleor.app.payment.paypal",
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      console.error("❌ Saleor API request failed:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch payment gateway configuration" },
        { status: response.status }
      );
    }
    
    const data: PaymentGatewayInitializeResponse = await response.json();

    // Check for GraphQL errors
    if (data.errors) {
      console.error("❌ GraphQL errors:", data.errors);
      return NextResponse.json(
        { error: "GraphQL error", details: data.errors },
        { status: 400 }
      );
    }

    // Extract PayPal gateway config
    const gatewayConfigs = data.data?.paymentGatewayInitialize?.gatewayConfigs;
    const errors = data.data?.paymentGatewayInitialize?.errors;

    // Check for mutation errors
    if (errors && errors.length > 0) {
      console.error("❌ Payment gateway initialization errors:", errors);
      return NextResponse.json(
        { error: "Failed to initialize payment gateway", details: errors },
        { status: 400 }
      );
    }

    // Find PayPal configuration
    const paypalConfig = gatewayConfigs?.find(
      (config) => config.id === "saleor.app.payment.paypal"
    );

    if (!paypalConfig) {
      console.error("❌ PayPal configuration not found in response");
      return NextResponse.json(
        { error: "PayPal payment gateway not available" },
        { status: 404 }
      );
    }

    // Check for config-specific errors
    if (paypalConfig.errors && paypalConfig.errors.length > 0) {
      console.error("❌ PayPal config errors:", paypalConfig.errors);
      return NextResponse.json(
        { error: "PayPal configuration error", details: paypalConfig.errors },
        { status: 400 }
      );
    }

    // Extract PayPal credentials from the data field
    const paypalData = paypalConfig.data;

    if (!paypalData) {
      console.error("❌ PayPal data is null or undefined");
      return NextResponse.json(
        { error: "PayPal configuration data not available" },
        { status: 500 }
      );
    }

    // Use the partner client ID (pk/paypalClientId) for the SDK
    // This is critical for multi-party payments (Google Pay, Apple Pay)
    const clientId = paypalData.paypalClientId;
    const merchantId = paypalData.merchantId;
    const paymentMethodReadiness = paypalData.paymentMethodReadiness;

    if (!clientId) {
      console.error("❌ PayPal client ID not found in configuration");
      return NextResponse.json(
        { error: "PayPal client ID not configured in the payment app" },
        { status: 500 }
      );
    }

    // Return the configuration with payment method readiness
    return NextResponse.json({
      clientId,
      merchantId,
      paymentMethodReadiness: paymentMethodReadiness || {
        applePay: false,
        googlePay: false,
        paypalButtons: true,
        advancedCardProcessing: false,
        vaulting: false,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching PayPal config:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
