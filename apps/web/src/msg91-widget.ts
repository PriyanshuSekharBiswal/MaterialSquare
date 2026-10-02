let sdkPromise: Promise<void> | undefined;
let initialized = false;

function widgetConfig() {
  const widgetId = import.meta.env.VITE_MSG91_WIDGET_ID?.trim();
  const tokenAuth = import.meta.env.VITE_MSG91_TOKEN_AUTH?.trim();
  if (!widgetId || !tokenAuth)
    throw new Error(
      "SMS sign-in is not configured yet. Please try again later.",
    );
  return { widgetId, tokenAuth };
}

async function initialize(): Promise<void> {
  const config = widgetConfig();
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://verify.msg91.com/otp-provider.js"]',
      );
      if (existing) {
        if (window.initSendOTP) resolve();
        else {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener(
            "error",
            () => reject(new Error("Could not load SMS verification.")),
            { once: true },
          );
        }
        return;
      }
      const script = document.createElement("script");
      script.src = "https://verify.msg91.com/otp-provider.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Could not load SMS verification."));
      document.head.appendChild(script);
    });
  }
  await sdkPromise;
  if (!window.initSendOTP)
    throw new Error("SMS verification is unavailable. Please try again later.");
  if (!initialized) {
    window.initSendOTP({
      ...config,
      exposeMethods: true,
      success: () => {},
      failure: () => {},
    });
    initialized = true;
  }
}

function sdkCall(
  invoke: (
    success: Msg91WidgetCallback,
    failure: (error: unknown) => void,
  ) => void,
): Promise<Msg91WidgetResponse> {
  return new Promise((resolve, reject) => {
    const failure = () =>
      reject(
        new Error("MSG91 could not complete verification. Please try again."),
      );
    try {
      invoke((response) => {
        if (response.type?.toLowerCase() === "error") failure();
        else resolve(response);
      }, failure);
    } catch {
      failure();
    }
  });
}

function requestId(response: Msg91WidgetResponse) {
  return response.reqId || response.message || "";
}

export async function sendMsg91Otp(phone: string): Promise<string> {
  await initialize();
  if (!window.sendOtp)
    throw new Error("SMS verification is unavailable. Please try again later.");
  const result = await sdkCall((success, failure) =>
    window.sendOtp!(`91${phone}`, success, failure),
  );
  return requestId(result);
}

export async function retryMsg91Otp(reqId: string): Promise<string> {
  await initialize();
  if (!window.retryOtp)
    throw new Error("SMS resend is unavailable. Please try again later.");
  const result = await sdkCall((success, failure) =>
    window.retryOtp!("11", success, failure, reqId || undefined),
  );
  return requestId(result) || reqId;
}

export async function verifyMsg91Otp(
  otp: string,
  reqId: string,
): Promise<string> {
  await initialize();
  if (!window.verifyOtp)
    throw new Error("SMS verification is unavailable. Please try again later.");
  const result = await sdkCall((success, failure) =>
    window.verifyOtp!(otp, success, failure, reqId || undefined),
  );
  const accessToken =
    result["access-token"] || result.accessToken || result.message;
  if (!accessToken || !accessToken.includes("."))
    throw new Error("Could not verify OTP. Please request a new code.");
  return accessToken;
}
