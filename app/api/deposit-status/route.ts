import { NextRequest, NextResponse } from 'next/server'

const ACROSS_API = 'https://app.across.to/api'
const API_KEY    = process.env.ACROSS_API_KEY!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const depositAddress = searchParams.get('depositAddress')
  const depositTxHash  = searchParams.get('depositTxHash')
  const originChainId  = searchParams.get('originChainId')
  const index          = searchParams.get('index') ?? '0'

  let params: URLSearchParams

  if (depositAddress) {
    params = new URLSearchParams({ depositAddress, index })
  } else if (depositTxHash && originChainId) {
    params = new URLSearchParams({ depositTxHash, originChainId })
  } else {
    return NextResponse.json({ error: 'Provide depositAddress or depositTxHash+originChainId' }, { status: 400 })
  }

  try {
    const res = await fetch(`${ACROSS_API}/deposit/status?${params}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: 'no-store',
    })
    const text = await res.text()
    let data: unknown
    try { data = JSON.parse(text) } catch {
      return NextResponse.json({ error: 'Non-JSON response', body: text.slice(0, 200) }, { status: 502 })
    }
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })
    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Request failed' }, { status: 500 })
  }
}
