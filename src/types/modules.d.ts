declare module 'bcryptjs';
declare module 'tailwind-merge' {
  export function twMerge(...inputs: Array<string | false | null | undefined>): string;
}

declare module '@mono.co/connect.js' {
  interface ConnectOptions {
    key: string;
    scope?: string;
    data?: Record<string, unknown>;
    onSuccess: (data: { code: string }) => void;
    onClose?: () => void;
  }
  export default class Connect {
    constructor(options: ConnectOptions);
    setup(): void;
    open(): void;
  }
}
