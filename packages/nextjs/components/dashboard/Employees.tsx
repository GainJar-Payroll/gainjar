

import {getStatusIcon,getStatusColor,formatAddress} from '~~/utils/Dashboard/Utils';
export const Employees = ({streams}) => {

  return (
   <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Employee Management</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  + Add Employee
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {streams.map((stream) => (
                  <div key={stream.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {stream.employeeName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(stream.status)}`}>
                        {getStatusIcon(stream.status)}
                        {stream.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-lg mb-1">{stream.employeeName}</h4>
                    <p className="text-sm text-gray-500 mb-4 font-mono">{formatAddress(stream.employeeAddress)}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Withdrawn:</span>
                        <span className="font-semibold">${stream.totalWithdrawn}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Unclaimed:</span>
                        <span className="font-semibold text-green-600">${stream.unclaimedBalance}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Stream Type:</span>
                        <span className="font-medium">{stream.type}</span>
                      </div>
                    </div>
                    
                    <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
 
  );
}
