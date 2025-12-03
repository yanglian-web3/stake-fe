import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import {
  arbitrum,
  base, hardhat,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from 'wagmi/chains';
// from https://cloud.walletconnect.com/
const ProjectId = 'e3242412afd6123ce1dda1de23a8c016'

export const config = getDefaultConfig({
  appName: 'MetaNode Stake',
  projectId: ProjectId,
  chains: [
    sepolia,
    hardhat
  ],
  transports: {
    // 替换之前 不可用的 https://rpc.sepolia.org/
    [sepolia.id]: http('https://sepolia.infura.io/v3/d8ed0bd1de8242d998a1405b6932ab33'),
    [hardhat.id]: http('http://127.0.0.1:8545'), // ✅ 添加这一行！
  },
  ssr: true,
});

export const defaultChainId: number = hardhat.id