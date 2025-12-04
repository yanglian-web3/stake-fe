// components/ContractDebugger.tsx
import { useState } from 'react'
import { useStakeContract } from '../hooks/useContract'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'

export const ContractTest = () => {
    const contract = useStakeContract()
    const { address } = useAccount()
    const [debugInfo, setDebugInfo] = useState<any>(null)

    const runDebug = async () => {
        if (!contract || !address) return

        const info: any = {
            contractAddress: contract.address,
            userAddress: address,
            timestamp: new Date().toISOString()
        }

        try {
            // 测试所有可能的方法
            const tests = [
                { name: 'poolLength', args: [] },
                { name: 'totalPoolWeight', args: [] },
                { name: 'stakingBalance', args: [0, address] },
                { name: 'userInfo', args: [0, address] },
                { name: 'pendingMetaNode', args: [0, address] },
            ]

            for (const test of tests) {
                try {
                    // @ts-ignore - 动态调用
                    const result = await contract.read[test.name](test.args)
                    info[test.name] = result
                    console.log(`✅ ${test.name}:`, result)
                } catch (error: any) {
                    info[test.name] = `Error: ${error.message}`
                    console.log(`❌ ${test.name} failed:`, error.message)
                }
            }

            // 格式化余额显示
            if (info.stakingBalance && typeof info.stakingBalance === 'bigint') {
                info.formattedStakingBalance = formatUnits(info.stakingBalance, 18) + ' ETH'
            }

            if (info.pendingMetaNode && typeof info.pendingMetaNode === 'bigint') {
                info.formattedPendingRewards = formatUnits(info.pendingMetaNode, 18) + ' MNT'
            }

            setDebugInfo(info)

        } catch (error) {
            console.error('Debug failed:', error)
        }
    }

    return (
        <div style={{
            border: '1px solid #ccc',
            padding: '10px',
            margin: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '5px'
        }}>
            <h3>合约调试器</h3>
            <button onClick={runDebug} style={{ marginBottom: '10px' }}>
                运行调试
            </button>

            {debugInfo && (
                <div style={{ textAlign: 'left' }}>
          <pre style={{
              backgroundColor: '#fff',
              padding: '10px',
              borderRadius: '3px',
              overflow: 'auto'
          }}>
            {JSON.stringify(debugInfo, (key, value) => {
                // 将 bigint 转换为字符串
                if (typeof value === 'bigint') {
                    return value.toString()
                }
                return value
            }, 2)}
          </pre>
                </div>
            )}
        </div>
    )
}

// 在 Home.tsx 中使用
// import { ContractDebugger } from '../components/ContractDebugger'
// <ContractDebugger />