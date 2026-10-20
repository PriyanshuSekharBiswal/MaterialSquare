export declare class InvalidApiProxyPathError extends Error {}

export declare function parseApiProxyPath(requestUrl: string): {
  path: string;
  query: string;
};
