import { NextRequest, NextResponse } from "next/server";

const TRANSACTION_PROCESS = `
  mutation TransactionProcess(
    $id: ID!
    $data: JSON
  ) {
    transactionProcess(
      id: $id
      data: $data
    ) {
      transaction {
        id
        actions
        chargedAmount {
          amount
          currency
        }
        checkout {
          id
        }
        order {
          id
          number
          total {
            gross {
              amount
              currency
            }
          }
        }
      }
      transactionEvent {
        pspReference
        message
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

const CHECKOUT_COMPLETE = `
  mutation CheckoutComplete($checkoutId: ID!) {
    checkoutComplete(checkoutId: $checkoutId) {
      order {
        id
        number
        total {
          gross {
            amount
            currency
          }
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, affirmTransactionId, checkoutId } = body;

    console.log("🔄 Processing Affirm payment:", { transactionId, affirmTransactionId, checkoutId });

    // Use transactionId if provided, otherwise fall back to checkoutId
    const saleorTransactionId = transactionId || checkoutId;

    if (!saleorTransactionId || !affirmTransactionId) {
      return NextResponse.json(
        { error: "Missing required fields: transactionId/checkoutId, affirmTransactionId" },
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

    if (token) {
      headers["Authorization"] = `JWT ${token}`;
    }

    console.log("📞 Calling Saleor TRANSACTION_PROCESS with ID:", saleorTransactionId);

    // Call Saleor's transaction process mutation
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: TRANSACTION_PROCESS,
        variables: {
          id: saleorTransactionId, // Use the correct transaction ID
          data: {
            affirmTransactionId: affirmTransactionId, // Send as object like PayPal
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Saleor request failed:", response.status, errorText);
      throw new Error(`Saleor request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("📋 Saleor response:", JSON.stringify(result, null, 2));

    const data = result.data;
    const graphqlErrors = result.errors;

    if (graphqlErrors || data?.transactionProcess?.errors?.length > 0) {
      const errorMessage =
        data?.transactionProcess?.errors?.[0]?.message ||
        graphqlErrors?.[0]?.message ||
        "Failed to process transaction";

      console.error("❌ Transaction process error:", errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const transaction = data?.transactionProcess?.transaction;
    const transactionEvent = data?.transactionProcess?.transactionEvent;
    const order = transaction?.order;

    console.log("🎯 Transaction processed:", {
      transactionId: transaction?.id,
      eventType: transactionEvent?.type,
      orderId: order?.id,
      orderNumber: order?.number,
    });

    // Check if payment was successful
    if (transactionEvent?.type && !transactionEvent.type.includes("SUCCESS")) {
      if (transactionEvent.type.includes("FAILURE")) {
        return NextResponse.json(
          { error: `Payment failed: ${transactionEvent?.message || "Unknown error"}` },
          { status: 400 }
        );
      }
    }

    if (order) {
      console.log("✅ Order created successfully:", order.number);
      
      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          number: order.number,
          total: order.total.gross.amount,
          currency: order.total.gross.currency,
        },
        transactionId: transaction.id,
      });
    } else {
      console.warn("⚠️ No order created by transactionProcess, attempting checkoutComplete...");

      // Try to complete the checkout manually
      const completeResponse = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: CHECKOUT_COMPLETE,
          variables: {
            checkoutId: checkoutId || transaction.checkout?.id,
          },
        }),
      });

      if (!completeResponse.ok) {
        console.error("❌ checkoutComplete request failed:", completeResponse.status);
        return NextResponse.json(
          {
            success: false,
            message: "Payment processed but order creation failed",
            transactionId: transaction?.id,
          },
          { status: 202 }
        );
      }

      const completeResult = await completeResponse.json();
      const completeData = completeResult.data;
      const completeErrors = completeResult.errors || completeData?.checkoutComplete?.errors;

      if (completeErrors && completeErrors.length > 0) {
        console.error("❌ checkoutComplete errors:", completeErrors);
        return NextResponse.json(
          {
            success: false,
            message: "Payment processed but order creation failed",
            transactionId: transaction?.id,
            details: completeErrors,
          },
          { status: 202 }
        );
      }

      const completedOrder = completeData?.checkoutComplete?.order;

      if (completedOrder) {
        console.log("✅ Order created via checkoutComplete:", completedOrder.id);
        
        return NextResponse.json({
          success: true,
          order: {
            id: completedOrder.id,
            number: completedOrder.number,
            total: completedOrder.total.gross.amount,
            currency: completedOrder.total.gross.currency,
          },
          transactionId: transaction.id,
        });
      } else {
        console.warn("⚠️ checkoutComplete did not create order");
        return NextResponse.json(
          {
            success: false,
            message: "Payment processed but order not created yet",
            transactionId: transaction?.id,
          },
          { status: 202 }
        );
      }
    }

  } catch (error) {
    console.error("❌ Error in process-payment API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
