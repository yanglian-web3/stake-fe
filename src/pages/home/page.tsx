'use client'
import { Box, Button, TextField, Typography } from "@mui/material"
import styles from '../../styles/Home.module.css';
import { useStakeContract } from "../../hooks/useContract";
import { useCallback, useEffect, useState } from "react";
import { Pid } from "../../utils";
import {useAccount, useWalletClient, useBalance, useBlockNumber, useBlock} from "wagmi";
import { formatUnits, parseUnits, zeroAddress } from "viem";
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
    address: address,
  })
  // 检查当前网络的 Gas 限制
  const { data: block } = useBlock({
    watch: true, // 自动监听新区块
  })

// 或者使用 useBlockNumber 获取最新区块号后再查询
  const { data: blockNumber } = useBlockNumber({ watch: true })
  // const updatePool = async () => {
  //   try {
  //     const res = await stakeContract?.write.updatePool([
  //       Pid,
  //       parseUnits('0.001', 18),
  //       100
  //     ])
  //     console.log(res, 'res')
  //   } catch (error) {
  //     console.log(error, 'addPool')
  //   }
  // }
// 检查真实的网络限制 - 使用 wagmi hook
  const verifyNetworkLimit = async () => {
    if (!data) {
      console.log("钱包未连接");
      return;
    }

    try {
      // 方法1: 使用 useBlock hook（推荐）
      if (block) {
        const currentGasLimit = block.gasLimit;
        console.log("实际网络 Gas 限制:", currentGasLimit.toString());
        console.log("当前区块号:", block.number.toString());

        // 您的交易 Gas 估算
        const yourTxGas = 20979492n;

        if (yourTxGas > currentGasLimit) {
          console.log("❌ 无法打包: 超出区块限制",
              Number((yourTxGas * 10000n / currentGasLimit - 10000n)) / 100 + "%");
        } else {
          console.log("✅ 理论上可以打包");
          console.log("将占用区块:",
              Number(yourTxGas * 10000n / currentGasLimit) / 100 + "% 的容量");
        }
      }
    } catch (error) {
      console.log("检查网络限制失败:", error);
    }
  };

  const handleStake = async () => {
    if (!stakeContract || !data) return;
    console.log(balance, amount, 'wallet');
    
    if (parseFloat(amount) > parseFloat(balance!.formatted)) {
      toast.error('Amount cannot be greater than current balance')
      return
    }
   
    try {
      setLoading(true)
      if(block){
        const currentGasLimit = block.gasLimit;
        const safeGasLimit = currentGasLimit * 80n / 100n; // 使用区块限制的80%

        console.log("当前区块限制:", currentGasLimit.toString());
        console.log("安全 Gas 限制:", safeGasLimit.toString());

        // 估算交易 Gas（如果有这个方法）
        let estimatedGas = 5000000n; // 默认值

        try {
          // 如果合约支持 estimateGas
          estimatedGas = await stakeContract.estimateGas.depositETH([], {
            value: parseUnits(amount, 18)
          });
          console.log("估算 Gas:", estimatedGas.toString());
        } catch (error) {
          console.log("Gas 估算失败，使用默认值");
        }

        // 如果估算值过高，使用安全限制
        const finalGas = estimatedGas > safeGasLimit ? safeGasLimit : estimatedGas;

        console.log("最终使用 Gas:", finalGas.toString());



        const tx = await stakeContract.write.depositETH([], {
          value: parseUnits(amount, 18),
          gas: finalGas,
          maxFeePerGas: parseUnits('30', 'gwei'),
          maxPriorityFeePerGas: parseUnits('2', 'gwei')
        })
        const res = await waitForTransactionReceipt(data, { hash: tx })
        console.log(res, 'tx')
        toast.success('Transaction receipt !')
        setLoading(false)
        getStakedAmount()
      }
    } catch (error) {
      setLoading(false);
      console.log(error, 'stake-error');

      // 更详细的错误处理
      if (error.message?.includes('gas')) {
        toast.error('Gas 设置有问题，请重试或联系支持');
      } else if (error.message?.includes('reverted')) {
        toast.error('合约执行失败，可能状态异常');
      } else {
        toast.error('交易失败: ' + error.shortMessage || error.message);
      }
    }
  }

  const getStakedAmount = useCallback(async () => {
    if (address && stakeContract) {
      console.log("stakeContract=", stakeContract)
      console.log("Pid=", Pid)
      console.log("address=", address)
      // const res = await stakeContract?.read.poolLength();
      const res = await stakeContract?.read?.stakingBalance([Pid, address])
      setStakedAmount(formatUnits(res as bigint, 18))
    }
  }, [stakeContract, address])

  useEffect(() => {

    if (stakeContract && address) {
      getStakedAmount()
    }

  }, [stakeContract, address])

  const checkPoolStatus = async () => {
    try {
      const poolLength = await stakeContract.read.poolLength()
      console.log('Pool length:', poolLength)

      if (poolLength > 0) {
        const poolInfo = await stakeContract.read.pool([0]) // ETH_PID = 0
        console.log('ETH Pool info:', poolInfo)

        const totalPoolWeight = await stakeContract.read.totalPoolWeight()
        console.log('Total pool weight:', totalPoolWeight)
      }
    } catch (error) {
      console.log('Pool status check failed:', error)
    }
  }
  const checkContractType = async () => {
    try {
      // 尝试读取代理特有的存储槽
      const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/d791bae253594e72ab45d587f840c9b4")

      // ERC-1967 实现地址存储槽
      const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
      const implementation = await provider.getStorage(stakeContract.address, IMPLEMENTATION_SLOT)

      if (implementation !== "0x" + "0".repeat(64)) {
        console.log("✅ 这是一个代理合约")
        console.log("实现地址:", "0x" + implementation.slice(-40))
      } else {
        console.log("❌ 这不是代理合约，或 ABI 不匹配")
      }
    } catch (error) {
      console.log("检查失败:", error)
    }
  }

// 在组件中使用
  useEffect(() => {
    if (stakeContract) {
      checkPoolStatus()
    }
  }, [stakeContract])

  return (
    <Box display={'flex'} flexDirection={'column'} alignItems={'center'} width={'100%'}>
      <Typography sx={{ fontSize: '30px', fontWeight: 'bold' }}>MetaNode Stake</Typography>
      <Typography sx={{}}>Stake ETH to earn tokens.</Typography>
      {/* <Button onClick={updatePool}>Update</Button> */}
      <Box sx={{ border: '1px solid #eee', borderRadius: '12px', p: '20px', width: '600px', mt: '30px' }}>
        <Box display={'flex'} alignItems={'center'} gap={'5px'} mb='10px'>
          <Box>Staked Amount: </Box>
          <Box>{stakedAmount} ETH</Box>
        </Box>
        <TextField onChange={(e) => {
          setAmount(e.target.value)
        }} sx={{ minWidth: '300px' }} label="Amount" variant="outlined" />
        <Box mt='30px'>
          {
            !isConnected ? <ConnectButton /> : <LoadingButton variant='contained' loading={loading} onClick={handleStake}>Stake</LoadingButton>
          }

        </Box>
      </Box>

    </Box>
  )
}

export default Home