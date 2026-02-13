"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import { EmployeeCard } from "~~/components/dashboard/employee-card";

const page = () => {
  const { address } = useAccount();

  // Get all employees for current employer
  const { data: employees } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getActiveEmployees",
    args: [address],
  });

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-5xl sm:text-6xl font-heading font-bold text-foreground mb-2">
            Employee Streams
          </h1>
          <p className="font-mono text-muted-foreground text-sm">
            Manage your employee payment streams
          </p>
        </div>

        {/* Employees Grid */}
        {!address ? (
          <div className="text-center py-12">
            <p className="font-mono text-muted-foreground">
              Please connect your wallet
            </p>
          </div>
        ) : !employees || employees.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-mono text-muted-foreground">
              No employees found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((employee: string) => (
              <EmployeeCard
                key={employee}
                employer={address}
                employee={employee}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default page;
