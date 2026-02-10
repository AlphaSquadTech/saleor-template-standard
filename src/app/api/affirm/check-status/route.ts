import { NextRequest, NextResponse } from "next/server";

const GET_TRANSACTION = `
  query GetTransaction($id: ID!) {
    transaction(id: $id) {
      id
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
      events {
        type
        createdAt
      }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutId, transactionId } = body;

    if (!checkoutId) {
      return NextResponse.json(
        { error: "Missing checkoutId" },
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

    // Check transaction status in Saleor
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: GET_TRANSACTION,
        variables: {
          id: transactionId || checkoutId,
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ completed: false });
    }

    const result = await response.json();
    const transaction = result.data?.transaction;
    const order = transaction?.order;

    // Check if order exists (payment completed)
    if (order) {
      return NextResponse.json({
        completed: true,
        order: {
          id: order.id,
          number: order.number,
          total: order.total.gross.amount,
          currency: order.total.gross.currency,
        },
      });
    }

    // Payment not completed yet
    return NextResponse.json({ completed: false });

  } catch (error) {
    console.error("❌ Error in check-status API:", error);
    return NextResponse.json({ completed: false });
  }
}
