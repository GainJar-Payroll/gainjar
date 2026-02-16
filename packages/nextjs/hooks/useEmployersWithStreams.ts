import { useMemo } from "react";
import { useScaffoldEventHistory } from "./scaffold-eth";

/**
 * Get all unique employers who have created streams for this employee
 * by reading StreamCreated events
 */
export function useEmployersWithStreams(employeeAddress: string | undefined) {
  const { data: streamCreatedEvents, isLoading } = useScaffoldEventHistory({
    contractName: "GainJar",
    eventName: "StreamCreated",
    fromBlock: 241942168n,
    filters: { _employee: employeeAddress },
    watch: true,
  });

  // Use useMemo to avoid re-creating array on every render
  const employers = useMemo(() => {
    if (!streamCreatedEvents || streamCreatedEvents.length === 0) {
      return [];
    }

    // Extract unique employers from events
    const uniqueEmployers = [
      ...new Set(
        streamCreatedEvents
          .map(event => event.args._employer)
          .filter((addr): addr is `0x${string}` => addr !== undefined),
      ),
    ];

    return uniqueEmployers;
  }, [streamCreatedEvents]);

  console.log("🚀 ~ useEmployersWithStreams ~ employers:", employers);
  return { employers, isLoading };
}
