import { ethers } from "ethers"
import { getHederaProvider, getHederaSigner, CONTRACT_ADDRESS } from "./hedera-config"

// Gig Marketplace Contract ABI - Based on actual deployed contract
const CONTRACT_ABI = [
  // Core gig functions
  "function createGig(string memory _title, string memory _description, uint256 _price)",
  "function getGig(uint256 _gigId) view returns (tuple(uint256 id, address provider, string title, string description, uint256 price, bool isActive, bool isCompleted))",
  "function updateGig(uint256 _gigId, string memory _title, string memory _description, uint256 _price)",
  "function deactivateGig(uint256 _gigId)",
  
  // Order functions
  "function orderGig(uint256 _gigId) payable",
  "function completeOrder(uint256 _orderId)",
  "function releasePayment(uint256 _orderId)",
  "function getOrder(uint256 _orderId) view returns (tuple(uint256 id, uint256 gigId, address client, address provider, uint256 amount, bool isCompleted, bool isPaid, uint256 createdAt))",
  
  // Query functions
  "function getProviderGigs(address _provider) view returns (uint256[])",
  "function getClientOrders(address _client) view returns (uint256[])",
  
  // Admin functions
  "function setPlatformFee(uint256 _feePercent)",
  "function withdrawPlatformFees()",
  "function pause()",
  "function unpause()",
  
  // State variables
  "function nextGigId() view returns (uint256)",
  "function nextOrderId() view returns (uint256)",
  "function platformFeePercent() view returns (uint256)",
  
  // Events
  "event GigCreated(uint256 indexed gigId, address indexed provider, string title, uint256 price)",
  "event GigUpdated(uint256 indexed gigId, string title, string description, uint256 price)",
  "event GigDeactivated(uint256 indexed gigId)",
  "event OrderCreated(uint256 indexed orderId, uint256 indexed gigId, address indexed client, uint256 amount)",
  "event OrderCompleted(uint256 indexed orderId)",
  "event PaymentReleased(uint256 indexed orderId, address indexed provider, uint256 amount)"
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

  // Gig-related methods
  async createGig(
    title: string,
    description: string,
    category: string,
    price: string,
    deliveryTime: string,
    requirements: string,
    tags: string[]
  ): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    
    try {
      const priceInWei = ethers.parseEther(price)
      
      // Combine all fields into description since contract only takes title, description, price
      const fullDescription = `${description}\n\nCategory: ${category}\nDelivery Time: ${deliveryTime}\nRequirements: ${requirements}\nTags: ${tags.join(', ')}`
      
      return await contractWithSigner.createGig(
        title,
        fullDescription,
        priceInWei
      )
    } catch (error: any) {
      console.error("Contract error:", error)
      if (error.code === "CALL_EXCEPTION" || error.message.includes("execution reverted")) {
        throw new Error("Failed to create gig. Please check the contract is properly initialized.")
      }
      throw error
    }
  }

  async getGig(gigId: number): Promise<any> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const gig = await this.contract.getGig(gigId)
      
      // Parse the description to extract additional fields
      const descParts = gig.description.split('\n\n')
      const mainDescription = descParts[0] || ""
      
      // Extract metadata from description if present
      let category = "General"
      let deliveryTime = "1 week"
      let requirements = ""
      let tags: string[] = []
      
      if (descParts.length > 1) {
        const metadata = descParts[1]
        const categoryMatch = metadata.match(/Category: (.+)/)
        const deliveryMatch = metadata.match(/Delivery Time: (.+)/)
        const requirementsMatch = metadata.match(/Requirements: (.+)/)
        const tagsMatch = metadata.match(/Tags: (.+)/)
        
        if (categoryMatch) category = categoryMatch[1]
        if (deliveryMatch) deliveryTime = deliveryMatch[1]
        if (requirementsMatch) requirements = requirementsMatch[1]
        if (tagsMatch) tags = tagsMatch[1].split(', ').filter(tag => tag.trim())
      }
      
      return {
        id: gig.id.toString(),
        seller: gig.provider, // Note: contract uses 'provider' not 'seller'
        title: gig.title,
        description: mainDescription,
        category: category,
        price: ethers.formatEther(gig.price),
        deliveryTime: deliveryTime,
        requirements: requirements,
        tags: tags,
        active: gig.isActive,
        createdAt: new Date() // Contract doesn't store creation timestamp
      }
    } catch (error) {
      console.error("Error getting gig:", error)
      throw error
    }
  }

  async getGigsByOwner(ownerAddress: string): Promise<number[]> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const gigIds = await this.contract.getProviderGigs(ownerAddress)
      return gigIds.map((id: any) => Number(id))
    } catch (error) {
      console.error("Error getting gigs by owner:", error)
      return []
    }
  }

  async getAllActiveGigs(): Promise<number[]> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      // Get the next gig ID to know how many gigs exist
      const nextGigId = await this.contract.nextGigId()
      const totalGigs = Number(nextGigId) - 1
      
      const activeGigs: number[] = []
      
      // Check each gig to see if it's active
      for (let i = 1; i <= totalGigs; i++) {
        try {
          const gig = await this.contract.getGig(i)
          if (gig.isActive) {
            activeGigs.push(i)
          }
        } catch (error) {
          // Skip gigs that don't exist or have errors
          continue
        }
      }
      
      return activeGigs
    } catch (error: any) {
      console.error("Error getting active gigs:", error)
      return []
    }
  }

  async updateGig(gigId: number, title: string, description: string, price: string): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    const priceInWei = ethers.parseEther(price)
    return await contractWithSigner.updateGig(gigId, title, description, priceInWei)
  }

  async deactivateGig(gigId: number): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    return await contractWithSigner.deactivateGig(gigId)
  }

  async getGigCount(): Promise<number> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const nextGigId = await this.contract.nextGigId()
      return Number(nextGigId) - 1 // Subtract 1 because IDs start from 1
    } catch (error) {
      console.error("Error getting gig count:", error)
      return 0
    }
  }

  // Order-related methods
  async orderGig(gigId: number, paymentAmount: string): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    const amountInWei = ethers.parseEther(paymentAmount)
    return await contractWithSigner.orderGig(gigId, { value: amountInWei })
  }

  async getOrder(orderId: number): Promise<any> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const order = await this.contract.getOrder(orderId)
      return {
        id: order.id.toString(),
        gigId: order.gigId.toString(),
        client: order.client,
        provider: order.provider,
        amount: ethers.formatEther(order.amount),
        isCompleted: order.isCompleted,
        isPaid: order.isPaid,
        createdAt: new Date(Number(order.createdAt) * 1000)
      }
    } catch (error) {
      console.error("Error getting order:", error)
      throw error
    }
  }

  async getClientOrders(clientAddress: string): Promise<number[]> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const orderIds = await this.contract.getClientOrders(clientAddress)
      return orderIds.map((id: any) => Number(id))
    } catch (error) {
      console.error("Error getting client orders:", error)
      return []
    }
  }

  // Listen for gig creation events
  onGigCreated(callback: (gigId: number, provider: string, title: string, price: string) => void) {
    if (!this.contract) return
    
    this.contract.on("GigCreated", (gigId, provider, title, price) => {
      callback(Number(gigId), provider, title, ethers.formatEther(price))
    })
  }

  // Remove all event listeners
  removeAllListeners() {
    if (this.contract) {
      this.contract.removeAllListeners()
    }
  }
}

export const contractService = new ContractService()