import { NextResponse } from 'next/server';
import { customerRequest } from '@/lib/shopify/customer-account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INTROSPECT_ORDER = /* GraphQL */ `
  query IntrospectOrder {
    __type(name: "Order") {
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
    const data = await customerRequest<{
      __type: { fields: { name: string; type: unknown }[] } | null;
    }>({ query: INTROSPECT_ORDER });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
