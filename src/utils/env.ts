import { Address, zeroAddress } from "viem";


// export const StakeContractAddress = process.env.NEXT_PUBLIC_STAKE_ADDRESS as Address || zeroAddress
// export const StakeContractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"

// console.log("StakeContractAddress=", StakeContractAddress)

// 找到定义合约地址的文件（可能是 utils/env.ts）
// 添加本地网络配置：

export const StakeContractAddress = {
    1: process.env.NEXT_PUBLIC_STAKE_ADDRESS, // 主网
    11155111: "0x01A01E8B862F10a3907D0fC7f47eBF5d34190341", // Sepolia
    // 31337: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", // ← 添加这一行！
    31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // ← 添加这一行！
    1337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
} as const;