
export const Settings = () => {
  return (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-6">Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employer Wallet Address
                  </label>
                  <input 
                    type="text" 
                    value="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Currency
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option>USDC</option>
                    <option>USDT</option>
                    <option>DAI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Network
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option>Ethereum Mainnet</option>
                    <option>Polygon</option>
                    <option>Arbitrum</option>
                  </select>
                </div>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Save Changes
                </button>
              </div>
            </div>
 
  )
}
