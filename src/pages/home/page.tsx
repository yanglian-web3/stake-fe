'use client'
import { Box, Button, TextField, Typography } from "@mui/material"
import { useStakeContract } from "../../hooks/useContract";
import { useCallback, useEffect, useState } from "react";
import { Pid } from "../../utils";
import {useAccount, useWalletClient, useBalance, useBlock} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import LoadingButton from '@mui/lab/LoadingButton';
import { toast } from "react-toastify";
import { waitForTransactionReceipt } from "viem/actions";

const Home = () => {
  const stakeContract = useStakeContract()
  const { address, isConnected } = useAccount()
  const [stakedAmount, setStakedAmount] = useState('0')
  const [amount, setAmount] = useState('0')
  const [loading, setLoading] = useState(false)
  const { data } = useWalletClient()
  const { data: balance } = useBalance({
    address,
    watch: true // 实时监控余额变化
  })
  const { data: block } = useBlock({
    watch: true,
  })

  const getStakedAmount = useCallback(async () => {
    if (!address || !stakeContract) {
      console.log("缺少地址或合约实例")
      return
    }

    console.log("获取质押余额...")
    console.log("合约地址:", stakeContract.address)
    console.log("用户地址:", address)

    try {
      // 1. 检查是否有池
      const poolLength = await stakeContract.read.poolLength()
      console.log("池数量:", poolLength.toString())

      if (poolLength === 0n) {
        console.log("没有池，设置为0")
        setStakedAmount('0')
        return
      }

      // 2. 获取质押余额
      const balance = await stakeContract.read.stakingBalance([Pid, address])
      console.log("质押余额:", formatUnits(balance, 18), "ETH")
      setStakedAmount(formatUnits(balance, 18))

    } catch (error: any) {
      console.error("获取质押余额失败:", error.message)
      // 尝试使用 userInfo 作为备用
      try {
        const userInfo = await stakeContract.read.userInfo([Pid, address])
        if (Array.isArray(userInfo) && userInfo.length > 0) {
          setStakedAmount(formatUnits(userInfo[0] as bigint, 18))
        } else {
          setStakedAmount('0')
        }
      } catch (fallbackError) {
        console.log("备用方案也失败，设置为0")
        setStakedAmount('0')
      }
    }
  }, [stakeContract, address])


  // 显示更多信息
  useEffect(() => {
    if (address && balance) {
      console.log('当前账户信息:')
      console.log('地址:', address)
      console.log('余额:', balance.formatted, balance.symbol)
      console.log('余额数值:', balance.value.toString())
    }
  }, [address, balance])

  /**
   * // 不同网络的 Gas Limit 上限
         const GAS_LIMITS = {
            1: 30000000n,       // 以太坊主网
            11155111: 16777216n, // Sepolia（最严格！）
            5: 30000000n,       // Goerli
            42161: 32000000n,   // Arbitrum
            10: 30000000n,      // Optimism
            137: 30000000n,     // Polygon
            56: 30000000n,      // BSC
            43114: 8000000n,    // Avalanche（较低）
            250: 30000000n,     // Fantom
            31337: 30000000n,   // Hardhat（本地）
            1337: 30000000n     // Ganache（本地）
          }
   */
  const handleStake = async () => {
    if (!stakeContract || !data || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (parseFloat(amount) > parseFloat(balance!.formatted)) {
      toast.error('Amount cannot be greater than current balance')
      return
    }

    try {
      setLoading(true)
      console.log('开始质押...', amount, 'ETH')

      // 获取当前网络信息
      const chain = await data.getChainId()
      console.log('当前网络:', chain)

      // 根据网络设置合适的 Gas Limit
      let gasSettings: any = {
        value: parseUnits(amount, 18),
      }

      // Sepolia 网络需要更合理的 Gas 设置
      if (chain === 11155111) { // Sepolia 网络
        console.log('Sepolia网络，使用合理的Gas设置')

        // 方法1：让钱包自动估算（推荐）
        try {
          const estimatedGas = await stakeContract.estimateGas.depositETH([], {
            value: parseUnits(amount, 18)
          })
          console.log('估算Gas:', estimatedGas.toString())

          // 添加一些缓冲（10%）
          const buffer = estimatedGas * 110n / 100n
          gasSettings.gas = buffer > 16777216n ? 16777216n : buffer

        } catch (estimateError) {
          console.log('Gas估算失败，使用默认值:', estimateError)
          // Sepolia 区块限制是 16777216
          gasSettings.gas = 10000000n // 1000万，安全的默认值
        }

      } else if (chain === 31337 || chain === 1337) { // 本地网络
        console.log('本地网络，使用较高的Gas Limit')
        gasSettings.gas = 5000000n // 本地可以给高一点
      } else {
        // 其他网络使用合理值
        gasSettings.gas = 10000000n
      }

      console.log('最终Gas设置:', gasSettings)

      const tx = await stakeContract.write.depositETH([], gasSettings)
      console.log('交易已发送:', tx)

      const receipt = await waitForTransactionReceipt(data, { hash: tx })
      console.log('交易确认:', receipt)

      toast.success('Stake successful!')
      setLoading(false)

      // 刷新余额
      getStakedAmount()
      setAmount('0')

    } catch (error: any) {
      setLoading(false)
      console.error('质押失败:', error)

      // 改进的错误处理
      if (error.message?.includes('transaction gas limit too high')) {
        toast.error('Gas limit too high for network. Try with smaller amount or contact support.')
      } else if (error.message?.includes('user rejected')) {
        toast.error('Transaction rejected by user')
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient balance')
      } else if (error.message?.includes('gas')) {
        toast.error('Gas estimation failed. Please try again.')
      } else {
        toast.error('Transaction failed: ' + (error.shortMessage || error.message))
      }
    }
  }

  // 检查合约状态
  const checkContractStatus = async () => {
    if (!stakeContract) return

    console.log("检查合约状态...")
    console.log("合约地址:", stakeContract.address)

    try {
      // 尝试读取合约所有者或管理员
      console.log("尝试读取合约基本信息...")

      // 检查是否有可读函数
      const readFunctions = Object.keys(stakeContract.read || {})
      console.log("可用的read函数:", readFunctions)

      // 尝试调用每个函数
      for (const func of readFunctions) {
        try {
          if (func === 'poolLength') {
            const result = await stakeContract.read.poolLength()
            console.log(`${func}:`, result)
          }
        } catch (e) {
          console.log(`${func} 调用失败`)
        }
      }

    } catch (error) {
      console.log("检查合约状态失败:", error)
    }
  }

  useEffect(() => {
    if (stakeContract && address) {
      console.log("合约和地址已就绪")
      getStakedAmount()
      checkContractStatus()
    }
  }, [stakeContract, address])

  // 监听区块变化，自动刷新余额
  useEffect(() => {
    if (stakeContract && address && isConnected) {
      const interval = setInterval(() => {
        getStakedAmount()
      }, 10000) // 每10秒刷新一次

      return () => clearInterval(interval)
    }
  }, [stakeContract, address, isConnected, getStakedAmount])
  return (
      <Box display={'flex'} flexDirection={'column'} alignItems={'center'} width={'100%'}>
        <Typography sx={{ fontSize: '30px', fontWeight: 'bold' }}>MetaNode Stake</Typography>
        <Typography sx={{}}>Stake ETH to earn tokens.</Typography>

        <Box sx={{ border: '1px solid #eee', borderRadius: '12px', p: '20px', width: '600px', mt: '30px' }}>
          <Box display={'flex'} alignItems={'center'} gap={'5px'} mb='10px'>
            <Box>Staked Amount: </Box>
            <Box>{stakedAmount} ETH</Box>
          </Box>

          <TextField
              onChange={(e) => setAmount(e.target.value)}
              sx={{ minWidth: '300px' }}
              label="Amount"
              variant="outlined"
              type="number"
          />

          <Box mt='30px'>
            {
              !isConnected ? (
                  <ConnectButton />
              ) : (
                  <LoadingButton
                      variant='contained'
                      loading={loading}
                      onClick={handleStake}
                      disabled={!amount || parseFloat(amount) <= 0}
                  >
                    Stake
                  </LoadingButton>
              )
            }
          </Box>

          {/* 调试按钮 */}
          <Box mt='20px'>
            <Button
                variant="outlined"
                size="small"
                onClick={checkContractStatus}
            >
              Debug Contract
            </Button>
          </Box>
        </Box>
      </Box>

      // <ContractTest />
  )
}

export default Home