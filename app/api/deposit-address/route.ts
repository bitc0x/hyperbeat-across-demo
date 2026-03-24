import { NextRequest, NextResponse } from 'next/server'

const ACROSS_API = 'https://app.across.to/api'
const API_KEY    = process.env.ACROSS_API_KEY!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const inputToken         = searchParams.get('inputToken')
  const originChainId      = searchParams.get('originChainId')
  const outputToken        = searchParams.get('outputToken')
  const destinationChainId = searchParams.get('destinationChainId')
  const recipient          = searchParams.get('recipient')
  const refundAddress      = searchParams.get('refundAddress') ?? recipient
  const amount             = searchParams.get('amount')

  if (!inputToken || !originChainId || !outputToken || !destinationChainId || !recipient || !amount) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'ACROSS_API_KEY not configured on server' }, { status: 500 })
  }

  const params = new URLSearchParams({
    useDepositAddress:  'true',
    inputToken,
    outputToken,
    originChainId,
    destinationChainId,
    recipient,
    refundAddress:      refundAddress!,
    amount,
    integratorId:       '0x00ce',
  })

  try {
    const res = await fetch(`${ACROSS_API}/swap/counterfactual?${params}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache:   'no-store',
    })

    const text = await res.text()

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: 'Across API returned non-JSON', status: res.status, body: text.slice(0, 500) },
        { status: 502 }
      )
    }

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
