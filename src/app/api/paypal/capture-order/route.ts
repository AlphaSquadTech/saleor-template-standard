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
    const { checkoutId, orderId, transactionId } = body;


    if (!checkoutId || !orderId) {
      return NextResponse.json(
        { error: "Missing required fields: checkoutId, orderId" },
        { status: 400 }
      );
    }

    // If no transactionId provided, we'll try to use checkoutId
    const txnId = transactionId || checkoutId;

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

    // Step 1: Process the transaction with PayPal order ID
    const processResponse = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: TRANSACTION_PROCESS,
        variables: {
          id: txnId,
          data: {
            paypalOrderId: orderId,
          },
        },
      }),
    });

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.error("❌ Response body:", errorText);
      throw new Error(`Transaction process request failed: ${processResponse.status}`);
    }

    const processResult = await processResponse.json();

    const processData = processResult.data;
    const processErrors = processResult.errors;

    if (processErrors || processData?.transactionProcess?.errors?.length > 0) {
      const errorMessage =
        processData?.transactionProcess?.errors?.[0]?.message ||
        processErrors?.[0]?.message ||
        "Failed to process transaction";


      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const transactionEvent = processData?.transactionProcess?.transactionEvent;
    const eventType = transactionEvent?.type;


    // Check if payment was successful
    if (eventType && !eventType.includes("SUCCESS")) {
      if (eventType.includes("FAILURE")) {
        return NextResponse.json(
          { error: `Payment failed: ${transactionEvent?.message || "Unknown error"}` },
          { status: 400 }
        );
      }
    }

    // Check if order was created by transactionProcess
    const transaction = processData?.transactionProcess?.transaction;
    let order = transaction?.order;

    // If no order exists yet, try to complete the checkout manually
    if (!order) {
      console.log("⚠️ Order not created by transactionProcess, attempting checkoutComplete...");

      // Try to complete the checkout manually
      const completeResponse = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: CHECKOUT_COMPLETE,
          variables: {
            checkoutId: checkoutId,
          },
        }),
      });

      if (!completeResponse.ok) {
        console.error("❌ checkoutComplete request failed:", completeResponse.status);

        // Return processing status - the webhook might complete it
        return NextResponse.json(
          {
            error: "Payment is being processed. Please wait a moment and check your order status.",
            checkoutId,
            transactionId: transaction?.id,
            status: "processing",
            message: "The payment has been authorized with PayPal. Your order is being created.",
          },
          { status: 202 } // 202 Accepted - processing
        );
      }

      const completeResult = await completeResponse.json();
      const completeData = completeResult.data;
      const completeErrors = completeResult.errors || completeData?.checkoutComplete?.errors;

      if (completeErrors && completeErrors.length > 0) {
        console.error("❌ checkoutComplete errors:", completeErrors);

        // Check if it's a duplicate key error (order already created)
        const isDuplicateError = completeErrors.some((err: { message?: string; extensions?: { exception?: { code?: string } } }) =>
          err.message?.includes('duplicate key') ||
          err.message?.includes('already exists') ||
          err.extensions?.exception?.code === 'IntegrityError'
        );

        if (isDuplicateError) {
          console.log("⚠️ Duplicate key error - order may already exist, checking transaction again...");

          // Re-fetch transaction to get the order that was created
          const recheckResponse = await fetch(apiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              query: TRANSACTION_PROCESS,
              variables: {
                id: txnId,
                data: {
                  paypalOrderId: orderId,
                },
              },
            }),
          });

          if (recheckResponse.ok) {
            const recheckResult = await recheckResponse.json();
            const recheckOrder = recheckResult.data?.transactionProcess?.transaction?.order;

            if (recheckOrder) {
              console.log("✅ Order found on recheck:", recheckOrder.id);
              order = recheckOrder;
            }
          }

          // If still no order after recheck, return processing status
          if (!order) {
            return NextResponse.json(
              {
                error: "Payment is being processed. Please wait a moment and check your order status.",
                checkoutId,
                transactionId: transaction?.id,
                status: "processing",
                message: "The payment has been authorized with PayPal. Your order is being created.",
              },
              { status: 202 } // 202 Accepted - processing
            );
          }
        } else {
          // Other errors - return processing status
          return NextResponse.json(
            {
              error: "Payment is being processed. Please wait a moment and check your order status.",
              checkoutId,
              transactionId: transaction?.id,
              status: "processing",
              message: "The payment has been authorized with PayPal. Your order is being created.",
              details: completeErrors,
            },
            { status: 202 } // 202 Accepted - processing
          );
        }
      }

      if (!order) {
        order = completeData?.checkoutComplete?.order;
      }

      if (!order) {
        console.warn("⚠️ checkoutComplete did not create order - may still be processing");

        // Return processing status
        return NextResponse.json(
          {
            error: "Payment is being processed. Please wait a moment and check your order status.",
            checkoutId,
            transactionId: transaction?.id,
            status: "processing",
            message: "The payment has been authorized with PayPal. Your order is being created.",
          },
          { status: 202 } // 202 Accepted - processing
        );
      }

      console.log("✅ Order created via checkoutComplete:", order.id);
    }

    console.log("✅ Payment captured and order created:", {
      orderId: order.id,
      orderNumber: order.number,
      total: order.total.gross.amount,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        number: order.number,
        total: order.total.gross.amount,
        currency: order.total.gross.currency,
      },
    });
  } catch (error) {
    console.error("❌ Error in capture-order API:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
