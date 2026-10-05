/// <reference types="vite/client" />
import type LocomotiveScroll from "locomotive-scroll";
declare global {
  type Msg91WidgetResponse = {
    type?: string;
    message?: string;
    reqId?: string;
    "access-token"?: string;
    accessToken?: string;
  };
  type Msg91WidgetCallback = (result: Msg91WidgetResponse) => void;
  interface Window {
    __lenis?: LocomotiveScroll["lenisInstance"];
    __locomotiveScroll?: LocomotiveScroll;
    initSendOTP?: (configuration: {
      widgetId: string;
      tokenAuth: string;
      exposeMethods: true;
      captchaRenderId?: string;
      success: Msg91WidgetCallback;
      failure: (error: unknown) => void;
    }) => void;
    sendOtp?: (
      identifier: string,
      success?: Msg91WidgetCallback,
      failure?: (error: unknown) => void,
    ) => void;
    retryOtp?: (
      channel: string | null,
      success?: Msg91WidgetCallback,
      failure?: (error: unknown) => void,
      reqId?: string,
    ) => void;
    verifyOtp?: (
      otp: string,
      success?: Msg91WidgetCallback,
      failure?: (error: unknown) => void,
      reqId?: string,
    ) => void;
  }
}
