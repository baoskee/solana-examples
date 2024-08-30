import { anchorProvider } from "@/lib/util"
import { Program } from "@coral-xyz/anchor";
import { Puppet, puppetIdl, PuppetMaster, puppetMasterIDL } from "anchor-local";

export default function PuppetMasterPage() {

  return <div>
    <h1>Puppet master</h1>

  </div>
}


const puppetMasterProgram = async () => {
  const provider = anchorProvider();
  return new Program<PuppetMaster>(
    // @ts-ignore
    puppetMasterIDL,
    provider
  )
}

const puppetProgram = async () => {
  const provider = anchorProvider();
  return new Program<Puppet>(
    // @ts-ignore
    puppetIdl,
    provider
  )
}
