"use client";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  TrendingUp, 
  Settings as SettingsIcon,
  Menu,
  X,
  ChevronRight,
  Clock,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Pause,
  Play,
  CheckCircle
} from "lucide-react";
import {Overview} from '~~/components/dashboard/Overview';
import {Streams} from '~~/components/dashboard/Streams';
import {Employees} from '~~/components/dashboard/Employees';
import {Settings} from '~~/components/dashboard/Settings';

import {getStatusIcon,getStatusColor,formatAddress} from '~~/utils/Dashboard/Utils';


const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data - ganti dengan data real dari blockchain
  const streams = [
    {
      id: "0x1a2b3c",
      employeeName: "John Doe",
      employeeAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      ratePerSecond: "0.000771604", // $2000/month
      type: "Infinite",
      status: "Active",
      totalWithdrawn: "1500.00",
      unclaimedBalance: "845.32",
      startDate: "2025-01-01"
    },
    {
      id: "0x4d5e6f",
      employeeName: "Jane Smith",
      employeeAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      ratePerSecond: "0.001157407", // $3000/month
      type: "Finite",
      status: "Active",
      totalWithdrawn: "2800.00",
      unclaimedBalance: "1234.56",
      startDate: "2025-01-01",
      endDate: "2025-12-31"
    },
    {
      id: "0x7g8h9i",
      employeeName: "Bob Johnson",
      employeeAddress: "0x9Fa8EfE5C2e7A89B1d8E3b2aD87c6F5e4d3C2b1A",
      ratePerSecond: "0.000578703", // $1500/month
      type: "Infinite",
      status: "Paused",
      totalWithdrawn: "900.00",
      unclaimedBalance: "0.00",
      startDate: "2024-12-15"
    }
  ];

  const vaultData = {
    totalBalance: "50000.00",
    totalStreaming: "6500.00",
    employeeCount: 3,
    activeStreams: 2
  };

  const transactions = [
    {
      id: 1,
      type: "Deposit",
      amount: "10000.00",
      from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      timestamp: "2025-02-06 10:30",
      status: "Completed"
    },
    {
      id: 2,
      type: "Withdraw",
      amount: "1500.00",
      to: "John Doe",
      toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      timestamp: "2025-02-05 14:20",
      status: "Completed"
    },
    {
      id: 3,
      type: "Withdraw",
      amount: "2800.00",
      to: "Jane Smith",
      toAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      timestamp: "2025-02-04 09:15",
      status: "Completed"
    },
    {
      id: 4,
      type: "Deposit",
      amount: "25000.00",
      from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      timestamp: "2025-02-01 08:00",
      status: "Completed"
    }
  ];

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "streams", label: "Salary Streams", icon: TrendingUp },
    { id: "employees", label: "Employees", icon: Users },
    { id: "vault", label: "Vault & Transactions", icon: Wallet },
    { id: "settings", label: "Settings", icon: SettingsIcon }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Logo & Toggle */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">StreamPay</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-2 transition-all ${
                  isActive 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
                {sidebarOpen && isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                EM
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Employer</div>
                <div className="text-xs text-gray-500">{formatAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {menuItems.find(item => item.id === activeTab)?.label}
          </h1>
          <p className="text-gray-500 mt-1">Kelola salary streaming berbasis blockchain</p>
        </header>

        {/* Content */}
        <div className="p-8">
          {activeTab === "overview" && (
            <Overview vaultData={vaultData} streams={streams} />  
          )}
          {activeTab === "streams" && (
                    <Streams streams={streams} />
                    )}

          {activeTab === "employees" && (
            <Employees streams={streams} />
          )}

          {activeTab === "vault" && (
            <div className="space-y-6">
              {/* Vault Balance Card */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-8 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm mb-2">Total Vault Balance</p>
                    <h2 className="text-4xl font-bold">${vaultData.totalBalance}</h2>
                    <p className="text-blue-100 text-sm mt-2">USDC</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                      Deposit
                    </button>
                    <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-medium">
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Transaction History</h3>
                  <p className="text-sm text-gray-500 mt-1">On-chain transaction events</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From/To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {tx.type === "Deposit" ? (
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <ArrowDownRight className="w-4 h-4 text-green-600" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                                </div>
                              )}
                              <span className="font-medium">{tx.type}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold">${tx.amount}</td>
                          <td className="px-6 py-4">
                            {tx.type === "Deposit" ? (
                              <div className="text-sm">
                                <div className="text-gray-500">From:</div>
                                <div className="font-mono text-gray-700">{formatAddress(tx.from)}</div>
                              </div>
                            ) : (
                              <div className="text-sm">
                                <div className="text-gray-500">To: {tx.to}</div>
                                <div className="font-mono text-gray-700">{formatAddress(tx.toAddress)}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {tx.timestamp}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
          <Settings />
         )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
