import { NextResponse } from 'next/server';
import { customerRequest } from '@/lib/shopify/customer-account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QUERY = /* GraphQL */ `
  query IntrospectPaymentTx {
    moneyBag: __type(name: "MoneyBag") {
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
    order: __type(name: "Order") {
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
    orderTransaction: __type(name: "OrderTransaction") {
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
    paymentInfo: __type(name: "OrderPaymentInformation") {
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
    paymentDetails: __type(name: "PaymentDetails") {
      kind
      possibleTypes {
        name
        fields {
          name
          type {
            name
            kind
          }
        }
      }
    }
    fulfillment: __type(name: "Fulfillment") {
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }
`;

export async function GET(): Promise<NextResponse> {
  try {
    const data = await customerRequest<unknown>({ query: QUERY });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
