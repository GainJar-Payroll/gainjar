


import {getStatusIcon,getStatusColor,formatAddress} from '~~/utils/Dashboard/Utils';
export const Streams = ({streams}) => {
  return (
   <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold">All Salary Streams</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  + Create Stream
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stream ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate/Second</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Withdrawn</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unclaimed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {streams.map((stream) => (
                      <tr key={stream.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{stream.employeeName}</div>
                            <div className="text-sm text-gray-500">{formatAddress(stream.employeeAddress)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-mono">{stream.id}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            stream.type === "Infinite" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                          }`}>
                            {stream.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-mono">{stream.ratePerSecond}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">${stream.totalWithdrawn}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600">${stream.unclaimedBalance}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(stream.status)}`}>
                            {getStatusIcon(stream.status)}
                            {stream.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

  )
}
