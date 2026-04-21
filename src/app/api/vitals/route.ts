import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    await request.json()
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

