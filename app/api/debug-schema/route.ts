import { NextResponse } from 'next/server';
import { customerRequest } from '@/lib/shopify/customer-account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INTROSPECT_DISCOUNT = /* GraphQL */ `
  query IntrospectDiscount {
    pricingValue: __type(name: "PricingValue") {
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
  }
`;

export async function GET(): Promise<NextResponse> {
  try {
    const data = await customerRequest<unknown>({ query: INTROSPECT_DISCOUNT });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
