import { ethers } from "ethers"

export const HEDERA_TESTNET_CONFIG = {
  name: "Hedera Testnet",
  rpcUrl: "https://testnet.hashio.io/api",
  chainId: 296,
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18,
  },
  blockExplorer: "https://hashscan.io/testnet",
}

export const CONTRACT_ADDRESS = "0x47fe84b56840a20BF579300207EBBaBc615AE1e9"

export function getHederaProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(HEDERA_TESTNET_CONFIG.rpcUrl)
}

export async function getHederaSigner(): Promise<ethers.Signer | null> {
  if (typeof window !== "undefined" && window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum)
    return await provider.getSigner()
  }
  return null
}

export async function switchToHederaNetwork(): Promise<void> {
  if (typeof window !== "undefined" && window.ethereum) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${HEDERA_TESTNET_CONFIG.chainId.toString(16)}` }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${HEDERA_TESTNET_CONFIG.chainId.toString(16)}`,
                chainName: HEDERA_TESTNET_CONFIG.name,
                rpcUrls: [HEDERA_TESTNET_CONFIG.rpcUrl],
                nativeCurrency: HEDERA_TESTNET_CONFIG.nativeCurrency,
                blockExplorerUrls: [HEDERA_TESTNET_CONFIG.blockExplorer],
              },
            ],
          })
        } catch (addError) {
          throw new Error("Failed to add Hedera testnet to wallet")
        }
      } else {
        throw new Error("Failed to switch to Hedera testnet")
      }
    }
  }
}