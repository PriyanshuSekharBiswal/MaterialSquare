let sdkPromise: Promise<void> | undefined;
let initializationPromise: Promise<void> | undefined;
let captchaContainer: HTMLElement | null = null;
const sdkUrl = "https://verify.msg91.com/otp-provider.js";

export function hasMsg91WidgetConfiguration(): boolean {
  return Boolean(
    import.meta.env.VITE_MSG91_WIDGET_ID?.trim() &&
    import.meta.env.VITE_MSG91_TOKEN_AUTH?.trim(),
  );
}

function widgetConfig() {
  const widgetId = import.meta.env.VITE_MSG91_WIDGET_ID?.trim();
  const tokenAuth = import.meta.env.VITE_MSG91_TOKEN_AUTH?.trim();
  if (!widgetId || !tokenAuth)
    throw new Error(
      "SMS sign-in is not configured yet. Please try again later.",
    );
  return { widgetId, tokenAuth };
}

export async function initializeMsg91Widget(): Promise<void> {
  if (!window.isSecureContext || !window.crypto?.subtle) {
    throw new Error(
      "MSG91 phone sign-in needs a secure browser context. This local site is using HTTP, which blocks the cryptography the verification widget needs. Set up trusted local HTTPS for material-square.localtest.me, then reopen this page.",
    );
  }
  const config = widgetConfig();
  const container = document.getElementById("msg91-captcha");
  if (container && captchaContainer && container !== captchaContainer) {
    // The SDK keeps its exposed methods bound to the original widget. Preserve
    // its CAPTCHA and listeners when the account form is mounted again.
    container.replaceChildren(...Array.from(captchaContainer.childNodes));
    captchaContainer = container;
  }
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${sdkUrl}"]`,
      );
      if (existing) {
        if (window.initSendOTP) resolve();
        else {
          if (existing.dataset.loaded === "true") {
            reject(new Error("SMS verification could not initialize."));
            return;
          }
          existing.addEventListener(
            "load",
            () => {
              existing.dataset.loaded = "true";
              resolve();
            },
            { once: true },
          );
          existing.addEventListener(
            "error",
            () => reject(new Error("Could not load SMS verification.")),
            { once: true },
          );
        }
        return;
      }
      const script = document.createElement("script");
      script.src = sdkUrl;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () =>
        reject(new Error("Could not load SMS verification."));
      document.head.appendChild(script);
    });
  }
  try {
    await sdkPromise;
  } catch (error) {
    sdkPromise = undefined;
    throw error;
  }
  if (!window.initSendOTP) {
    sdkPromise = undefined;
    throw new Error("SMS verification is unavailable. Please try again later.");
  }
  if (!initializationPromise) {
    initializationPromise = new Promise<void>((resolve, reject) => {
      let done = false;
      const timeout = window.setTimeout(() => {
        if (!done) {
          done = true;
          reject(new Error("SMS verification could not initialize."));
        }
      }, 15000);
      const check = () => {
        if (
          window.sendOtp &&
          window.retryOtp &&
          window.verifyOtp &&
          (!window.getWidgetData || window.getWidgetData())
        ) {
          done = true;
          window.clearTimeout(timeout);
          resolve();
          return;
        }
        if (!done) window.setTimeout(check, 25);
      };
      try {
        window.initSendOTP!({
          ...config,
          exposeMethods: true,
          captchaRenderId: "msg91-captcha",
          success: () => {},
          failure: () => {
            if (done) return;
            done = true;
            window.clearTimeout(timeout);
            reject(
              new Error(
                "SMS security check could not load. Please try again later.",
              ),
            );
          },
        });
        check();
      } catch {
        done = true;
        window.clearTimeout(timeout);
        reject(new Error("SMS verification could not initialize."));
      }
    }).catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }
  await initializationPromise;
  captchaContainer = container;
}

function sdkCall(
  operation: "send" | "resend" | "verify",
  invoke: (
    success: Msg91WidgetCallback,
    failure: (error: unknown) => void,
  ) => void,
): Promise<Msg91WidgetResponse> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("SMS verification timed out. Please try again."));
    }, 20000);
    const failure = (error?: unknown) => {
      window.clearTimeout(timeout);
      const details = safeFailureDetails(error);
      console.warn("MSG91 OTP widget request failed", { operation, details });
      reject(
        new Error(
          /block|too many|throttl|limit|429/i.test(details)
            ? "MSG91 has temporarily limited attempts from this network. Please try again later."
            : operation === "verify"
              ? "MSG91 couldn't verify this code. Use the latest code and try again."
              : "MSG91 couldn't send the code. Complete the CAPTCHA and try again.",
        ),
      );
    };
    try {
      invoke((response) => {
        window.clearTimeout(timeout);
        if (response.type?.toLowerCase() === "error") failure(response);
        else resolve(response);
      }, failure);
    } catch (error) {
      failure(error);
    }
  });
}

function safeFailureDetails(error: unknown): string {
  if (Array.isArray(error))
    return error.slice(0, 4).map(safeFailureDetails).join(" ").slice(0, 120);
  const value =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object"
          ? ["code", "message", "type", "status"]
              .map((key) => (error as Record<string, unknown>)[key])
              .filter(
                (part): part is string | number =>
                  typeof part === "string" || typeof part === "number",
              )
              .join(" ")
          : "";
  return value
    .replace(/\b\d{6}\b/g, "[code]")
    .replace(/\b(?:91)?[6-9]\d{9}\b/g, "[number]")
    .replace(/\beyJ[A-Za-z0-9._-]+/g, "[token]")
    .slice(0, 120);
}

function requestId(response: Msg91WidgetResponse) {
  return response.reqId || response.message || "";
}

export async function sendMsg91Otp(phone: string): Promise<string> {
  await initializeMsg91Widget();
  if (
    window.getWidgetData?.()?.captchaValidations &&
    window.isCaptchaVerified &&
    !window.isCaptchaVerified()
  )
    throw new Error("Complete the CAPTCHA before requesting your code.");
  if (!window.sendOtp)
    throw new Error("SMS verification is unavailable. Please try again later.");
  const result = await sdkCall("send", (success, failure) =>
    window.sendOtp!(`91${phone}`, success, failure),
  );
  const reqId = requestId(result);
  if (!reqId)
    throw new Error("SMS was not accepted. Please check the number and retry.");
  return reqId;
}

export async function retryMsg91Otp(reqId: string): Promise<string> {
  await initializeMsg91Widget();
  if (!window.retryOtp)
    throw new Error("SMS resend is unavailable. Please try again later.");
  const result = await sdkCall("resend", (success, failure) =>
    window.retryOtp!("11", success, failure, reqId || undefined),
  );
  return requestId(result) || reqId;
}

export async function verifyMsg91Otp(
  otp: string,
  reqId: string,
): Promise<string> {
  await initializeMsg91Widget();
  if (!window.verifyOtp)
    throw new Error("SMS verification is unavailable. Please try again later.");
  const result = await sdkCall("verify", (success, failure) =>
    window.verifyOtp!(otp, success, failure, reqId || undefined),
  );
  const accessToken =
    result["access-token"] || result.accessToken || result.message;
  if (!accessToken || !accessToken.includes("."))
    throw new Error("Could not verify OTP. Please request a new code.");
  return accessToken;
}
