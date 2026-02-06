import { CheckCircle, Pause, Play } from "lucide-react";

export const getStatusIcon = status => {
  switch (status) {
    case "Active":
      return <Play className="w-3 h-3" />;
    case "Paused":
      return <Pause className="w-3 h-3" />;
    case "Completed":
      return <CheckCircle className="w-3 h-3" />;
    default:
      return null;
  }
};

export const getStatusColor = status => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Paused":
      return "bg-yellow-100 text-yellow-800";
    case "Completed":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const formatAddress = address => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
