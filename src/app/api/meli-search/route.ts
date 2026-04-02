import { NextResponse } from "next/server"
import https from "https"

function fetchMeli(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = https.get(
            url,
            {
                headers: {
                    "User-Agent": "MercadoLibre/14.0.0 (Android 13)",
                    "X-Platform": "Android",
                    "Accept": "application/json",
                    "Accept-Encoding": "identity",
                },
            },
            (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    const loc = res.headers.location
                    if (loc) { fetchMeli(loc).then(resolve).catch(reject); return }
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP_${res.statusCode}`))
                    return
                }
                let data = ""
                res.on("data", (chunk) => (data += chunk))
                res.on("end", () => resolve(data))
                res.on("error", reject)
            }
        )
        req.on("error", reject)
        req.end()
    })
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")

    if (!q) {
        return NextResponse.json({ error: "Missing 'q' param" }, { status: 400 })
    }

    try {
        const url = `https://api.mercadolibre.com/sites/MCO/search?q=${encodeURIComponent(q)}&limit=15&condition=new`
        const raw = await fetchMeli(url)
        const data = JSON.parse(raw)
        return NextResponse.json(data)
    } catch (e: any) {
        console.error("MELI proxy error:", e.message)
        // Return a special status so the server action knows to use fallback
        return NextResponse.json(
            { error: e.message, fallback: true },
            { status: 503 }
        )
    }
}

export const dynamic = "force-dynamic"
