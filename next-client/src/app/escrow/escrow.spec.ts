import { PublicKey } from "@solana/web3.js"
import { describe, it, expect } from "vitest"

describe("finding instruction data", () => {
  const TAKER = "HNc5mQKb5X7Agsk866kxM1yLv6dVDTPJnuPSsanGhrFo"
  const WRONG_TAKER = "F2t7zdGxCb53NNfrfpEJVtoW7YLA9DuBnL2MCTnooz8w"

  it("print bytes until wrong taker is found", () => {
    const pubkey = new PublicKey(TAKER)
    const buffer = pubkey.toBuffer()
    for (let i = 0; i < buffer.length; i++) {
      const addr = new PublicKey(buffer.slice(0, i + 1))
      console.log(addr.toBase58())
    }
  })
})
