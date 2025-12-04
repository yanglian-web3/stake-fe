import { sepolia, hardhat  } from "viem/chains";
import { PublicClient, createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'



const defaultClient =   createPublicClient({
  chain: hardhat,
  transport: http('http://127.0.0.1:8545') // 本地节点地址
})

export const viemClients = (chaiId: number): PublicClient => {

  // console.log("viemClients chaiId=", chaiId)
  const clients: {
    [key: number]: PublicClient
  } = {
    [sepolia.id]: createPublicClient({
      chain: sepolia,
      transport: http('https://sepolia.infura.io/v3/d8ed0bd1de8242d998a1405b6932ab33')
    }),
    [hardhat.id]: defaultClient
  }
  return clients[chaiId] || defaultClient
}