import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  TrendingUp, 
  Settings,
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
import {getStatusIcon,getStatusColor,formatAddress} from '~~/utils/Dashboard/Utils';


export const Overview = ({ vaultData, streams }) => {
  


  return (

  <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Vault Balance</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">${vaultData.totalBalance}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-4 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Healthy balance
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Streaming</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">${vaultData.totalStreaming}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">Per bulan</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Streams</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{vaultData.activeStreams}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">dari {vaultData.employeeCount} total</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Employees</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{vaultData.employeeCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">Karyawan aktif</p>
                </div>
              </div>

              {/* Recent Streams */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Active Salary Streams</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stream ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate/Second</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unclaimed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {streams.filter(s => s.status === "Active").map((stream) => (
                        <tr key={stream.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{stream.employeeName}</div>
                              <div className="text-sm text-gray-500">{formatAddress(stream.employeeAddress)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{stream.id}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{stream.ratePerSecond} USDC</td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-600">${stream.unclaimedBalance}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(stream.status)}`}>
                              {getStatusIcon(stream.status)}
                              {stream.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
}
