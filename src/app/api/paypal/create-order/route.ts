import { NextRequest, NextResponse } from "next/server";

const TRANSACTION_INITIALIZE = `
  mutation TransactionInitialize(
    $id: ID!
    $amount: PositiveDecimal!
    $paymentGateway: PaymentGatewayToInitialize!
    $idempotencyKey: String
  ) {
    transactionInitialize(
      id: $id
      amount: $amount
      paymentGateway: $paymentGateway
      idempotencyKey: $idempotencyKey
    ) {
      transaction {
        id
        actions
      }
      transactionEvent {
        pspReference
        amount {
          amount
          currency
        }
        type
      }
      data
      errors {
        field
        message
        code
      }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutId, amount, currency = "USD" } = body;


    if (!checkoutId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: checkoutId, amount" },
        { status: 400 }
      );
    }

    // Get Saleor API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }


    // Get auth token from request cookies
    const token = request.cookies.get("token")?.value;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add auth token if available (needed for checkout access)
    if (token) {
      headers["Authorization"] = `JWT ${token}`;
    }

    // Generate idempotency key for safe retries
    const idempotencyKey = `paypal-${checkoutId}-${Date.now()}`;

    // Get the storefront URL for return/cancel URLs
    const storefrontUrl =
      process.env.NEXT_PUBLIC_STOREFRONT_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";

    const requestBody = {
      query: TRANSACTION_INITIALIZE,
      variables: {
        id: checkoutId,
        amount: amount.toString(),
        // action: "CHARGE",  // REMOVED: This field requires HANDLE_PAYMENTS permission
        paymentGateway: {
          id: "saleor.app.payment.paypal",
          data: {
            // Pass return and cancel URLs to PayPal app
            returnUrl: `${storefrontUrl}/checkout?checkoutId=${checkoutId}&payment=success`,
            cancelUrl: `${storefrontUrl}/checkout?checkoutId=${checkoutId}&payment=cancelled`,
          },
        },
        idempotencyKey,
      },
    };


    // Call Saleor's transaction initialize mutation
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    // Always try to parse the response body to see GraphQL errors
    const result = await response.json();

    if (!response.ok) {
      console.error(
        "❌ GraphQL request failed:",
        response.status,
        response.statusText
      );
      console.error("❌ Response body:", result);

      // Try to extract more specific error from GraphQL response
      const errorDetail =
        result.errors?.[0]?.message || result.error || response.statusText;
      throw new Error(
        `GraphQL request failed: ${response.status} - ${errorDetail}`
      );
    }

    const data = result.data;
    const graphqlErrors = result.errors;

    if (graphqlErrors || data?.transactionInitialize?.errors?.length > 0) {
      const errorMessage =
        data?.transactionInitialize?.errors?.[0]?.message ||
        graphqlErrors?.[0]?.message ||
        "Failed to initialize transaction";

      console.error("❌ Transaction initialize error:", errorMessage);

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Extract PayPal order ID from response
    // Saleor's PayPal app returns the order ID in the `data` field
    const responseData = data?.transactionInitialize?.data;
    const transactionId = data?.transactionInitialize?.transaction?.id;
    const transactionEvent = data?.transactionInitialize?.transactionEvent;
    const errors = data?.transactionInitialize?.errors;

    console.log("📋 Transaction details:", {
      transactionId,
      eventType: transactionEvent?.type,
      pspReference: transactionEvent?.pspReference,
      responseData,
      errors,
    });

    // Check if the transaction failed
    if (
      transactionEvent?.type === "CHARGE_FAILURE" ||
      transactionEvent?.type === "AUTHORIZATION_FAILURE"
    ) {
      console.error("❌ PayPal transaction failed:", {
        eventType: transactionEvent.type,
        responseData,
        errors,
      });

      return NextResponse.json(
        {
          error: "Transaction failed",
          eventType: transactionEvent.type,
          transactionId,
          responseData,
          errors,
        },
        { status: 400 }
      );
    }

    // The PayPal order ID is in responseData.paypal_order_id
    const orderId =
      responseData?.paypal_order_id ||
      responseData?.paypalOrderId ||
      responseData?.orderId ||
      transactionEvent?.pspReference;

    if (!orderId) {
      console.error("❌ No PayPal order ID in response:", {
        responseData,
        transactionEvent,
      });
      return NextResponse.json(
        {
          error: "No PayPal order ID in response",
          responseData,
          transactionEvent,
        },
        { status: 500 }
      );
    }

    console.log("✅ PayPal order created:", orderId);

    return NextResponse.json({
      orderId,
      transactionId,
      checkoutId,
      amount,
      currency,
    });
  } catch (error) {
    console.error("❌ Error in create-order API:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
