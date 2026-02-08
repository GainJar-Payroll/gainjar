// src/routes.ts
export const ROUTES = {
	HOME: "/",
	DASHBOARD: "/dashboard",
	EMPLOYER_DASHBOARD: "/dashboard/employer",
	VAULT: "/vault",
	STREAMS: {
	  LIST: "/streams",
	  DETAIL: (id: string) => `/streams/${id}`,
	},
  } as const;