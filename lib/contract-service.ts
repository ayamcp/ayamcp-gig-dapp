import { ethers } from "ethers"
import { getHederaProvider, getHederaSigner, CONTRACT_ADDRESS } from "./hedera-config"

// Basic ERC-20/Contract ABI - you may need to update this based on your actual contract
const CONTRACT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
]

export class ContractService {
  private contract: ethers.Contract | null = null
  private provider: ethers.JsonRpcProvider

  constructor() {
    this.provider = getHederaProvider()
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider)
  }

  async getContractWithSigner(): Promise<ethers.Contract> {
    const signer = await getHederaSigner()
    if (!signer) {
      throw new Error("No wallet connected")
    }
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
  }

  async getContractName(): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      return await this.contract.name()
    } catch (error) {
      console.error("Error getting contract name:", error)
      return "Unknown"
    }
  }

  async getContractSymbol(): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      return await this.contract.symbol()
    } catch (error) {
      console.error("Error getting contract symbol:", error)
      return "UNKNOWN"
    }
  }

  async getTotalSupply(): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const totalSupply = await this.contract.totalSupply()
      return ethers.formatEther(totalSupply)
    } catch (error) {
      console.error("Error getting total supply:", error)
      return "0"
    }
  }

  async getBalance(address: string): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const balance = await this.contract.balanceOf(address)
      return ethers.formatEther(balance)
    } catch (error) {
      console.error("Error getting balance:", error)
      return "0"
    }
  }

  async transfer(to: string, amount: string): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    const amountWei = ethers.parseEther(amount)
    return await contractWithSigner.transfer(to, amountWei)
  }

  async approve(spender: string, amount: string): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    const amountWei = ethers.parseEther(amount)
    return await contractWithSigner.approve(spender, amountWei)
  }

  async getAllowance(owner: string, spender: string): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const allowance = await this.contract.allowance(owner, spender)
      return ethers.formatEther(allowance)
    } catch (error) {
      console.error("Error getting allowance:", error)
      return "0"
    }
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash)
  }

  getContractAddress(): string {
    return CONTRACT_ADDRESS
  }

  getBlockExplorerUrl(txHash: string): string {
    return `https://hashscan.io/testnet/transaction/${txHash}`
  }
}

export const contractService = new ContractService()